# Database Architecture Security Review

## Student App Platform — Schoen Cyber Solutions LLC

**Reviewer:** Senior Security Engineer  
**Date:** 2026-09-09  
**Document Reviewed:** `docs/database-design.md` v0.1.0  
**Classification:** Internal — Engineering & Security

---

## Executive Summary

The database architecture design is sound at a high level and correctly applies the principle of identity separation. However, several **security weaknesses**, **missing entities**, and **production readiness gaps** have been identified that must be addressed before the schema is implemented. The most critical concerns are:

1. **Authorization is underspecified** — coarse-grained ENUM roles without a capabilities model.
2. **Audit trail is absent** — no immutable log of security-relevant events.
3. **Message table is an abuse vector** — unbounded content, no rate state, no retention policy.
4. **Encryption design is incomplete** — application-level encryption without key management documentation.
5. **Scalability of messages is unaddressed** — no partitioning, archiving, or query-cost controls.

None of these are fatal flaws, but each requires a design decision and documented mitigation before schema creation.

---

## 1. Identity Separation

### 1.1 FINDING: JOIN Boundary Between User and UniversityIdentity Is Insufficiently Protected

**Severity:** High  
**Status:** Design Gap

The design correctly places university identity in a separate table (`UniversityIdentity`). However, the foreign key `university_identity.user_id → users.id` is a direct 1:1 link. Any backend service with `SELECT` on both tables can trivially join public usernames to private university emails and Blackboard IDs.

**Risk:** A compromised backend service account or a SQL injection vulnerability could deanonymize the entire user base in a single query.

**Recommendation:**
- Enforce **row-level security (RLS)** in PostgreSQL so that the application database user cannot join across the two tables.
- Alternatively, use **physically separate databases or schemas** with distinct credentials for identity lookup vs. public profile lookup.
- Document a **"no-join policy"** — public API queries must never include `university_identity` in the query planner.

### 1.2 FINDING: Encrypted Columns Are Indexed

**Severity:** Medium  
**Status:** Design Gap

`blackboard_user_id`, `university_email`, and `student_id_number` are marked as encrypted but also indexed. If application-level encryption (e.g., AES-256-GCM with per-column keys) is used, indexing encrypted ciphertext is meaningless for equality lookups unless deterministic encryption is used. Deterministic encryption leaks frequency information and creates oracle risks.

**Risk:**
- If deterministic AES-SIV is used: frequency analysis can identify popular email domains or common Blackboard IDs.
- If random IVs are used: the index is useless and wastes space and write throughput.

**Recommendation:**
- Use a **blind index** (HMAC of the plaintext) stored in a separate column for equality lookups, while the ciphertext uses randomized encryption.
- Or: re-evaluate whether these columns need indexes at all. Blackboard sync is typically done by `user_id` (internal UUID), not by `blackboard_user_id`.

---

## 2. Authentication

### 2.1 FINDING: No Session or Token Storage Entity

**Severity:** High  
**Status:** Missing Entity

The design documents JWT sessions in the security architecture document but the database schema contains no `sessions`, `refresh_tokens`, or `access_tokens` table. This means:
- Token revocation is impossible (no server-side token blacklist).
- Concurrent session limits cannot be enforced.
- Compromised tokens cannot be invalidated without rotating the global signing key.
- Login audit trail is incomplete.

**Recommendation:** Add a `sessions` table:

```
sessions
  id              UUID PK
  user_id         UUID FK → users.id
  token_hash      VARCHAR(255)  -- SHA-256 of the JWT or refresh token
  device_info     VARCHAR(255)  -- user-agent fingerprint (hashed)
  ip_address      INET  -- store as hash or truncated for privacy
  created_at      TIMESTAMPTZ
  expires_at      TIMESTAMPTZ
  revoked_at      TIMESTAMPTZ
  revoked_reason  ENUM
```

### 2.2 FINDING: No Failed Authentication Attempt Logging

**Severity:** Medium  
**Status:** Missing Entity

There is no `login_attempts` or `auth_events` table. Brute-force attacks against the future university login flow cannot be detected or throttled at the database layer.

**Recommendation:** Add an `auth_events` table (or use the audit log) to record:
- Event type (`login_success`, `login_failure`, `token_refresh`, `logout`)
- Timestamp
- IP address (hashed)
- User identifier (username or attempted username)
- Failure reason (if applicable)

---

## 3. Authorization

### 3.1 FINDING: Role-Based Access Control Is Hardcoded and Coarse

**Severity:** High  
**Status:** Design Weakness

The `enrollments.role` field is an ENUM (`student`, `instructor`, `teaching_assistant`). This is insufficient for a platform that will grow to include:
- Course creators
- Department admins
- Platform moderators
- Super admins
- Read-only observers

Hardcoding roles as ENUMs requires a schema migration every time a new role is added.

**Risk:** Future authorization requirements will force painful migrations. Fine-grained permissions (e.g., "can pin messages", "can delete others' messages", "can invite users") cannot be expressed.

**Recommendation:** Implement a **capabilities-based model**:

```
roles
  id          UUID PK
  name        VARCHAR(50) UNIQUE
  description TEXT

capabilities
  id          UUID PK
  name        VARCHAR(100) UNIQUE  -- e.g., "chat:write", "chat:moderate"

role_capabilities
  role_id     UUID FK
  capability_id UUID FK

user_roles
  id          UUID PK
  user_id     UUID FK
  role_id     UUID FK
  scope_type  ENUM  -- "global", "course", "chat"
  scope_id    UUID  -- nullable; FK to course_id or chat_id
```

Keep `enrollments` for university-verified membership, but separate **platform roles** from **enrollment roles**.

### 3.2 FINDING: Chat Membership Is Implicit, Not Explicit

**Severity:** Medium  
**Status:** Design Gap

Chat access is granted implicitly through `enrollments` (`course_id` → `chats.course_id`). There is no `chat_memberships` table. This means:
- A student cannot be removed from a chat without removing their enrollment.
- A student cannot be muted in a chat while remaining enrolled.
- Direct messaging (student-to-student, outside courses) is impossible to model.

**Recommendation:** Add an explicit `chat_memberships` table:

```
chat_memberships
  id          UUID PK
  chat_id     UUID FK → chats.id
  user_id     UUID FK → users.id
  role        ENUM  -- "member", "moderator", "muted"
  joined_at   TIMESTAMPTZ
  left_at     TIMESTAMPTZ
```

For MVP, this can be auto-populated from enrollments, but the schema should support explicit membership.

### 3.3 FINDING: No Platform Admin or Moderator Model

**Severity:** Medium  
**Status:** Missing Entity

There is no concept of a platform administrator or global moderator in the schema. The `users` table has no `is_admin`, `is_staff`, or `trust_level` field. When moderation features are added, there will be no database-level way to identify who can perform moderation actions.

**Recommendation:** Add `user_trust_levels` or use the `roles`/`capabilities` model above. At minimum, add:
- `users.is_staff` (BOOLEAN, DEFAULT false)
- `users.is_superuser` (BOOLEAN, DEFAULT false)

### 3.4 FINDING: Enrollment Lacks Temporal Validity

**Severity:** Medium  
**Status:** Design Gap

`enrollments` has `verified_at` but no `valid_until`, `semester_start`, or `semester_end`. A student verified in Fall 2026 will still have `is_active = true` in Spring 2028 unless a sync job happens to catch the change.

**Risk:** Graduated students retain access to course communities indefinitely if sync fails.

**Recommendation:**
- Add `enrollments.valid_from` and `enrollments.valid_until`.
- Backend authorization checks must evaluate `valid_until` in addition to `is_active`.
- University sync jobs should set `valid_until` based on academic term end dates.

---

## 4. Privacy

### 4.1 FINDING: student_id_number Is Stored Unnecessarily

**Severity:** Medium  
**Status:** Data Minimization Violation

`university_identity.student_id_number` is included in the schema. The application's stated purpose is course communities and chat. There is no product feature that requires the university's internal student ID number. It is sensitive PII that increases breach impact without providing commensurate value.

**Recommendation:** Remove `student_id_number` from the MVP schema. If a future feature requires it, add it then with explicit justification.

### 4.2 FINDING: avatar_url Is a Potential Identity Leak

**Severity:** Low  
**Status:** Privacy Concern

`avatar_url` is stored as a text field. If this points to external object storage (e.g., S3), the URL may:
- Contain the user's internal UUID or email in the path.
- Be guessable (sequential IDs in the URL).
- Leak the storage provider (infrastructure fingerprinting).

**Recommendation:**
- Store avatars behind a backend proxy so the public URL does not expose storage infrastructure.
- Use content-addressed storage (hash-based filenames) to prevent enumeration.
- Scan uploaded avatars for EXIF data stripping.

### 4.3 FINDING: Message Content Is Stored in Plaintext at Application Level

**Severity:** Medium  
**Status:** Design Gap

`messages.content` is `TEXT NOT NULL` with no application-level encryption. The design relies on PostgreSQL TDE or filesystem encryption "at rest." However, if the database is compromised via SQL injection or a stolen backup, messages are readable in plaintext.

**Risk:** Chat messages may contain sensitive personal information. A database breach exposes all course community conversations.

**Recommendation:**
- Evaluate **per-message encryption** with keys derived from the chat or user pair (for future E2E).
- For MVP: encrypt `content` at application level with a chat-specific key, or accept the risk and document it with a compensating control (strict DB access controls, RLS).
- At minimum: hash or tokenize PII patterns in messages (emails, phone numbers) before storage.

### 4.4 FINDING: User Account Deletion Is Not Modeled

**Severity:** Medium  
**Status:** Missing Feature

There is no `deleted_at` or `anonymized_at` field on `users`. GDPR Article 17 (Right to Erasure) and FERPA student rights require the ability to delete or anonymize accounts. The current schema uses `is_active` which is a soft-disable, not deletion.

**Recommendation:**
- Add `users.deleted_at` and `users.anonymized_at`.
- Define an **anonymization cascade**:
  - `users.username` → random placeholder (`deleted_user_7f3a`)
  - `users.display_name`, `bio`, `avatar_url` → NULL
  - `messages.user_id` → already SET NULL on delete
  - `university_identity` → CASCADE delete (university link is fully removed)

---

## 5. Data Minimization

### 5.1 FINDING: Messages Have No Retention Policy

**Severity:** Medium  
**Status:** Scalability & Privacy Concern

The `messages` table has no `retention_until`, `archived_at`, or automatic purge mechanism. In a production university app, course chats generate thousands of messages per week. Over four years, this becomes millions of rows.

**Risk:**
- Storage cost grows linearly forever.
- Privacy risk accumulates — old messages contain outdated personal context.
- Backup and restore times increase.

**Recommendation:**
- Add `messages.retention_policy` (ENUM: `standard`, `extended`, `delete_on_course_end`).
- Create a `message_archives` cold storage table (or S3) for messages older than N days.
- Define a default policy: messages deleted 1 year after course end date, unless the university requests longer retention.

### 5.2 FINDING: blackboard_course_id May Not Need Long-Term Storage

**Severity:** Low  
**Status:** Design Question

`courses.blackboard_course_id` is encrypted and indexed. After a course ends and sync stops, this external ID provides no value to the application. It is retained indefinitely.

**Recommendation:**
- Evaluate whether `blackboard_course_id` can be purged after course archival.
- If retained, document the justification (e.g., "required for historical audit").

### 5.3 FINDING: bio Field Is 500 Characters

**Severity:** Low  
**Status:** Minor Concern

`users.bio` allows 500 characters. While not excessive, it is unnecessary for MVP and provides a vector for:
- URL injection (phishing links in profiles)
- Cross-site scripting (if not properly sanitized before display)
- External image embedding (if URLs are allowed)

**Recommendation:**
- Reduce to 200 characters for MVP.
- Implement URL and HTML sanitization before storage.
- Validate with a strict regex (alphanumeric + spaces + basic punctuation).

---

## 6. Abuse Prevention

### 6.1 FINDING: No Rate-Limiting State Table

**Severity:** High  
**Status:** Missing Entity

The design mentions Redis for rate limiting in the architecture diagram but does not document the schema. More critically, **there is no database table for rate-limiting audit**. If Redis is lost or misconfigured, there is no durable record of abuse.

**Recommendation:** Add an `abuse_events` or `rate_limit_violations` table:

```
abuse_events
  id              UUID PK
  user_id         UUID FK → users.id (nullable)
  ip_address_hash VARCHAR(64)
  event_type      ENUM  -- "rate_limit", "spam", "login_brute_force"
  resource        VARCHAR(255)  -- endpoint or chat_id
  count           INTEGER
  window_start    TIMESTAMPTZ
  window_end      TIMESTAMPTZ
  action_taken    ENUM  -- "throttled", "blocked", "notified"
```

### 6.2 FINDING: Messages Lack Rate State Per User

**Severity:** Medium  
**Status:** Design Gap

There is no `user_message_rate` or rolling window counter. A single user could flood a chat with thousands of messages before any automated detection triggers.

**Recommendation:**
- Add a `user_chat_activity` table or use Redis counters with database persistence:
  ```
  user_chat_activity
    user_id     UUID FK
    chat_id     UUID FK
    message_count INTEGER  -- rolling window
    window_start  TIMESTAMPTZ
  ```

### 6.3 FINDING: No Content Moderation Status on Messages

**Severity:** Medium  
**Status:** Missing Field

The `messages` table has `is_deleted` (soft delete) but no `moderation_status`. There is no way to:
- Quarantine a message pending review.
- Mark a message as "approved by moderator."
- Flag a message as "auto-flagged by ML."

**Recommendation:** Add to `messages`:
- `moderation_status` ENUM (`pending`, `approved`, `flagged`, `removed`)
- `moderated_by` UUID FK → users.id
- `moderated_at` TIMESTAMPTZ
- `moderation_reason` VARCHAR(255)

### 6.4 FINDING: Username Enumeration Through UNIQUE Index

**Severity:** Low  
**Status:** Information Disclosure

`users.username` has a `UNIQUE` constraint. A timing attack or explicit error message ("username already taken" vs. "username available") can be used to enumerate registered users.

**Recommendation:**
- During registration, return the same response time and error message regardless of whether the username exists.
- Use a constant-time comparison for username availability checks.
- Consider adding a delay or CAPTCHA after repeated availability checks.

---

## 7. Production Readiness

### 7.1 FINDING: No Audit Log Table

**Severity:** Critical  
**Status:** Missing Entity

There is no immutable `audit_log` table. Security events such as:
- User verification success/failure
- Enrollment changes
- Role changes
- Moderation actions
- Username changes
- Token revocations

...have nowhere to be durably recorded. This is essential for incident response, compliance, and forensic investigation.

**Recommendation:** Add a generic, append-only `audit_log` table:

```
audit_log
  id              UUID PK
  occurred_at     TIMESTAMPTZ
  actor_type      ENUM  -- "user", "system", "admin"
  actor_id        UUID  -- nullable; FK to users.id or NULL for system
  action          VARCHAR(100)  -- "user.verified", "enrollment.created", "message.deleted"
  resource_type   VARCHAR(50)  -- "user", "enrollment", "message"
  resource_id     UUID
  old_value       JSONB
  new_value       JSONB
  ip_address_hash VARCHAR(64)
  user_agent_hash VARCHAR(64)
```

**Critical rule:** `audit_log` rows are **never updated or deleted**. Only `INSERT`.

### 7.2 FINDING: No Backup, Migration, or DR Strategy

**Severity:** High  
**Status:** Missing Documentation

The design document does not address:
- Database migration tooling (e.g., `node-pg-migrate`, `Prisma migrations`, `Flyway`).
- Backup frequency and retention.
- Point-in-time recovery (PITR) requirements.
- Read replica strategy for message queries.
- Disaster recovery RTO/RPO targets.

**Recommendation:** Add a "Database Operations" appendix covering:
- Migration tool selection and rollback procedures.
- Backup encryption (backups must be encrypted separately from TDE).
- Cross-region replica strategy.
- Connection pooling (PgBouncer or equivalent) limits.

### 7.3 FINDING: No Query Cost Controls on Messages

**Severity:** Medium  
**Status:** Scalability Risk

`messages` will be the largest table. The proposed indexes (`chat_id`, `(chat_id, created_at)`) are correct for pagination, but there is no:
- Maximum page size limit (a `?limit=999999` query would be catastrophic).
- Cursor-based pagination requirement documented (offset pagination is O(n) expensive).
- Query timeout enforcement at the database or ORM layer.

**Recommendation:**
- Enforce a **maximum page size of 100** at the application layer.
- Use **cursor-based pagination** (keyset on `created_at + id`) for all message list endpoints.
- Set `statement_timeout` in PostgreSQL for the application role (e.g., 5 seconds).

### 7.4 FINDING: Foreign Key CASCADE May Destroy Evidence

**Severity:** Medium  
**Status:** Design Risk

Multiple tables use `ON DELETE CASCADE`:
- `university_identity` → `users`
- `enrollments` → `users`
- `messages` → `chats`

If a user is deleted, their enrollments and university identity vanish. This destroys evidence that could be needed for:
- University audit requests
- Legal holds
- Moderation investigations

**Recommendation:**
- Change `enrollments.user_id` and `university_identity.user_id` from `CASCADE` to `SET NULL` or implement **anonymization instead of deletion**.
- If CASCADE is retained, require that the `audit_log` captures the full record before deletion.

### 7.5 FINDING: Encryption Key Management Is Undocumented

**Severity:** High  
**Status:** Design Gap

The design states "application-level encryption" for sensitive columns but provides no key management strategy:
- Where are encryption keys stored?
- How are they rotated?
- Who has access?
- How are they backed up?
- Is there a key per-tenant (university) or a global key?

**Recommendation:** Document a key management architecture:
- Use ** envelope encryption** — data keys encrypted by a master key in AWS KMS / Azure Key Vault.
- Each university gets a distinct data encryption key (DEK).
- Master key never leaves the HSM.
- Key rotation procedure: re-encrypt ciphertext with new DEK annually.

---

## 8. Missing Entities Summary

The following entities are required for a secure, production-ready system but are absent from the schema:

| Entity | Priority | Purpose |
|---|---|---|
| `audit_log` | Critical | Immutable security event log |
| `sessions` | High | Token lifecycle, revocation, concurrent session limits |
| `auth_events` | High | Login success/failure tracking, brute-force detection |
| `roles` + `capabilities` + `role_capabilities` | High | Fine-grained, extensible RBAC |
| `chat_memberships` | Medium | Explicit chat access, muting, DM support |
| `abuse_events` / `rate_limit_violations` | Medium | Durable abuse detection record |
| `message_moderation` (or fields on `messages`) | Medium | Content moderation workflow |
| `user_preferences` (from future extensions) | Low | MVP can defer |
| `notifications` (from future extensions) | Low | MVP can defer |

---

## 9. Risk Matrix

```
Impact
  High │  No audit log       Hardcoded RBAC      No session storage
       │  JOIN boundary risk
       │
       │  Unbounded messages  Encrypted col index  No key mgmt doc
  Med  │  No retention policy No account deletion  Enrollment validity
       │  student_id storage  Message plaintext    No FK evidence protect
       │  Content moderation
       │
  Low  │  Username enum       avatar_url leak     bio field size
       │
       └──────────────────────────────────────────────────────────►
              Low              Medium              High
                            Likelihood
```

---

## 10. Recommendations Priority Queue

### Must Fix Before Schema Implementation

1. Add `audit_log` table (append-only, immutable).
2. Add `sessions` table (token lifecycle).
3. Replace hardcoded `enrollments.role` ENUM with a `roles`/`capabilities` model.
4. Document encryption key management architecture.
5. Protect the `User` ↔ `UniversityIdentity` boundary (RLS or schema separation).

### Fix Before Production

6. Add `auth_events` table or extend `audit_log` for authentication events.
7. Add `chat_memberships` table for explicit membership.
8. Add moderation fields to `messages` (`moderation_status`, `moderated_by`).
9. Add enrollment temporal validity (`valid_from`, `valid_until`).
10. Implement cursor-based pagination and page size limits.
11. Remove `student_id_number` or justify its retention.
12. Define message retention and archival policy.

### Fix Post-MVP

13. Add `abuse_events` table.
14. Add `user_chat_activity` rate tracking.
15. Implement avatar URL proxy and EXIF stripping.
16. Document backup, DR, and migration strategy.
17. Evaluate per-message application-level encryption.

---

## Reviewer Sign-off

This review was conducted against `docs/database-design.md` v0.1.0. All findings are actionable and prioritized. The schema is fundamentally sound but requires the above hardening before implementation and deployment.

**Next Action:** Engineering team to respond to each finding with either:
- A schema update, or
- A risk-accepted justification documented in `docs/database-design.md`

---

*Review completed 2026-09-09.*
