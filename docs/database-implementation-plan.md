# Database Implementation Plan

## Student App Platform — Schoen Cyber Solutions LLC

**Version:** 0.1.0  
**Date:** 2026-09-09  
**Status:** Planning — Ready for Execution  
**Classification:** Internal — Engineering

---

## Table of Contents

1. [Database Technology](#1-database-technology)
2. [Environment Setup](#2-environment-setup)
3. [Implementation Order](#3-implementation-order)
4. [Migration Strategy](#4-migration-strategy)
5. [Seed Data](#5-seed-data)
6. [Security Requirements](#6-security-requirements)
7. [Development Workflow](#7-development-workflow)
8. [MVP Database Scope](#8-mvp-database-scope)
9. [Rollback Procedures](#9-rollback-procedures)
10. [Checklist](#10-checklist)

---

## 1. Database Technology

### Stack

| Layer | Technology | Version |
|---|---|---|
| Primary database | PostgreSQL | 15+ |
| ORM | Prisma | 5.x |
| Backend runtime | Node.js | 20+ |
| Backend language | TypeScript | 5.x |
| Backend framework | Express.js | 4.x |

### Architecture

```
Mobile App (Expo / React Native)
    |
    | HTTPS / TLS 1.3
    v
Backend API (Node.js + Express + TypeScript)
    |
    | Prisma Client
    v
Prisma ORM
    |
    | PostgreSQL wire protocol (SSL)
    v
PostgreSQL
```

### Why Prisma

- **Type safety:** Auto-generated TypeScript types from schema definitions.
- **Migrations:** Declarative schema changes with versioned migration files.
- **Query builder:** Fluent, type-safe query API that prevents SQL injection.
- **Connection pooling:** Built-in `PrismaClient` connection management.
- **Schema as source of truth:** Single `schema.prisma` file drives the entire data layer.

### PostgreSQL Requirements

- **Version:** 15 or later.
- **Extensions:** `uuid-ossp` (for UUID generation), `pgcrypto` (for encryption utilities).
- **Character set:** UTF-8.
- **SSL:** Required for all connections outside `localhost`.

---

## 2. Environment Setup

### Environment Definitions

| Environment | Purpose | Data | Notes |
|---|---|---|---|
| `development` | Local engineer workstation | Synthetic test data only | Hot reload, Prisma Studio available |
| `staging` | Pre-production validation | Anonymized snapshots | Mirrors production configuration |
| `production` | Live student platform | Real student data | Managed PostgreSQL with encryption |

### Environment Variables

```bash
# Required
DATABASE_URL="postgresql://user:password@host:port/studentapp?schema=public&sslmode=require"

# Future (read/write splitting)
# DATABASE_READ_URL="postgresql://readonly:password@read-replica:port/studentapp"
# DATABASE_WRITE_URL="postgresql://writer:password@primary:port/studentapp"
```

### Development Setup

1. **Install PostgreSQL locally** (via Docker, Homebrew, or Postgres.app).
2. **Create database:**
   ```bash
   createdb studentapp_dev
   ```
3. **Set `.env`:**
   ```bash
   DATABASE_URL="postgresql://localhost:5432/studentapp_dev"
   ```
4. **Install Prisma:**
   ```bash
   npm install prisma @prisma/client
   npx prisma init
   ```

### Production Setup

- Use a **managed PostgreSQL service** (AWS RDS, Google Cloud SQL, Azure Database, or equivalent).
- Enable **SSL/TLS** for all connections.
- Enable **automated backups** with point-in-time recovery (PITR).
- Use a **dedicated application user** with minimal permissions.
- Enable **connection pooling** (PgBouncer or equivalent) if concurrent load exceeds 100 connections.

---

## 3. Implementation Order

Database models will be implemented in five phases. Each phase is a self-contained deliverable that can be merged independently.

### Phase 1: Foundation

**Goal:** Establish identity and university support.

**Tables:**

| Table | Purpose |
|---|---|
| `User` | Internal application identity and public profile |
| `University` | Supported universities |
| `UniversityIdentity` | Private university verification data |

**Acceptance Criteria:**
- [ ] Can create a `User` with a unique username.
- [ ] Can create a `University`.
- [ ] Can link a `UniversityIdentity` to a `User` and a `University`.
- [ ] Username validation rules enforced at the application layer.

**Estimated Effort:** 1 day

---

### Phase 2: University Integration

**Goal:** Connect to Blackboard and represent course enrollment.

**Tables:**

| Table | Purpose |
|---|---|
| `Course` | University courses |
| `Enrollment` | Student-course membership (authorization backbone) |

**Acceptance Criteria:**
- [ ] Can create a `Course` linked to a `University`.
- [ ] Can create an `Enrollment` linking a `User` to a `Course`.
- [ ] Enrollment unique constraint `(user_id, course_id)` enforced.
- [ ] Enrollment `valid_until` prevents access after expiry.

**Estimated Effort:** 1 day

---

### Phase 3: Authentication

**Goal:** Secure session and external provider management.

**Tables:**

| Table | Purpose |
|---|---|
| `Authentication` | Links users to external providers (Blackboard, Microsoft, etc.) |
| `Session` | Active token lifecycle and revocation |

**Acceptance Criteria:**
- [ ] Can store a provider credential in `Authentication`.
- [ ] Can create a `Session` with a hashed token.
- [ ] Can revoke a session by setting `revoked_at`.
- [ ] Expired sessions are rejected by the backend.

**Estimated Effort:** 1 day

---

### Phase 4: Community Features

**Goal:** Enable course discussions with threads and messages.

**Tables:**

| Table | Purpose |
|---|---|
| `Thread` | Student-created discussions inside courses |
| `Message` | Replies inside threads |

**Acceptance Criteria:**
- [ ] Can create a `Thread` inside a `Course`.
- [ ] Can post a `Message` inside a `Thread`.
- [ ] Soft-delete (`is_deleted`) hides messages without destroying history.
- [ ] Thread soft-delete (`is_deleted`, `deleted_at`) preserves audit trail.
- [ ] Pagination returns max 100 records per page using cursor-based pagination.

**Estimated Effort:** 1–2 days

---

### Phase 5: Security and Administration

**Goal:** Audit logging and extensible role-based access control.

**Tables:**

| Table | Purpose |
|---|---|
| `AuditLog` | Immutable security event log |
| `Role` | Platform roles |
| `Capability` | Granular permissions |
| `RoleCapability` | Role-to-capability mapping |
| `UserRole` | Scoped role assignments |

**Acceptance Criteria:**
- [ ] Can write an `AuditLog` entry that is append-only.
- [ ] Can define a `Role` with `Capability` assignments.
- [ ] Can assign a `UserRole` scoped to a course.
- [ ] MVP ships with at least `student`, `instructor`, and `moderator` roles.
- [ ] Capability framework is documented for future expansion.

**Estimated Effort:** 2 days

---

## 4. Migration Strategy

### Tooling

- **Prisma Migrate** is the sole migration tool.
- **No manual SQL changes** to any environment.
- **No direct `ALTER TABLE`** in production outside of Prisma Migrate.

### Migration Rules

1. **Every schema change creates a migration.**
   ```bash
   npx prisma migrate dev --name add_user_roles
   ```

2. **Migration files are committed to Git.**
   - `prisma/migrations/YYYYMMDD_HHMMSS_migration_name/migration.sql`
   - `prisma/migrations/migration_lock.toml`

3. **Production migrations are applied via CI/CD.**
   ```bash
   npx prisma migrate deploy
   ```
   - `prisma migrate deploy` runs in the deployment pipeline.
   - Never run `prisma migrate dev` in production.

4. **Schema changes require code review.**
   - All `prisma/schema.prisma` changes must be reviewed by another engineer.
   - Destructive changes (column drops, type changes) require explicit approval.

5. **Migration squash before GA.**
   - Before the first production release, consider squashing development migrations into a single baseline.

### Naming Convention

```
YYYYMMDD_HHMMSS_verb_noun
```

Examples:
- `20260909_120000_create_user_university`
- `20260909_140000_add_enrollment_temporal_fields`
- `20260910_090000_add_thread_soft_delete`

---

## 5. Seed Data

### Purpose

Seed data provides a reproducible local environment for development and testing. It must never contain real student information or production credentials.

### Seed Script Location

```
prisma/
  schema.prisma
  seed.ts
```

### Seed Data Content

**University:**

```
name:     Roosevelt University
domain:   roosevelt.edu
slug:     roosevelt
lms:      blackboard
```

**User:**

```
username: CyberFox27
bio:      "Cybersecurity student and open-source contributor."
```

**Course:**

```
course_code: CSIA308
name:        Cybersecurity Fundamentals
```

**Enrollment:**

```
user:     CyberFox27
course:   CSIA308
role:     Student
```

### Seed Rules

- **No real student data.** All names, emails, and IDs are fictional.
- **No production secrets.** Blackboard credentials are not seeded.
- **Idempotent.** Running the seed script multiple times must not create duplicates.
- **Flagged.** Seed data is marked with `is_seed = true` where appropriate, or isolated in a seed-only script.

### Running Seeds

```bash
npx prisma db seed
```

---

## 6. Security Requirements

### Credential Management

| Rule | Enforcement |
|---|---|
| Database credentials only in environment variables | `DATABASE_URL` loaded from `.env`; never in source code. |
| `.env` excluded from Git | `.gitignore` includes `.env` and `.env.*`. |
| `.env.example` provided | Template documents required variables without real values. |

### Access Control

| Rule | Enforcement |
|---|---|
| No mobile app database access | Mobile app has zero database credentials; all access through backend API. |
| Least privilege database users | Production uses separate users: `app_read`, `app_write`, `app_migrate`. |
| Encrypted connections | PostgreSQL `sslmode=require` for all non-local connections. |
| Connection limits | `PgBouncer` or equivalent if concurrent connections exceed 100. |

### Data Protection

| Rule | Enforcement |
|---|---|
| No production data in development | Development uses synthetic seed data only. |
| Sensitive columns encrypted at rest | Application-level encryption for `blackboard_user_id`, `university_email`. |
| Audit logging | All security-relevant events written to `AuditLog`. |
| Query cost limits | `statement_timeout = 5000ms` for application role. |
| Page size limits | Max 100 records per API response; cursor-based pagination. |

---

## 7. Development Workflow

### Standard Workflow

```
1. Update Prisma schema
   |
   v
2. Create migration
   npx prisma migrate dev --name describe_change
   |
   v
3. Apply migration locally
   (automated by Prisma Migrate dev)
   |
   v
4. Update seed data (if needed)
   |
   v
5. Test backend
   npm run typecheck
   npm run test (when available)
   |
   v
6. Commit migration files
   git add prisma/migrations/ prisma/schema.prisma
   git commit
```

### Schema Change Checklist

Before committing any schema change:

- [ ] Schema compiles: `npx prisma validate`
- [ ] Migration generated: `npx prisma migrate dev`
- [ ] Types regenerated: `npx prisma generate`
- [ ] Backend typecheck passes: `npm run typecheck`
- [ ] Migration file committed: `prisma/migrations/...`
- [ ] No destructive changes without approval.

### Branch Strategy

| Branch | Database | Migrations |
|---|---|---|
| `feature/*` | Local | Create and test migrations locally. |
| `main` | Staging | Auto-deploy migrations to staging on merge. |
| `release/*` | Production | Manual promotion; `prisma migrate deploy` in CI. |

---

## 8. MVP Database Scope

### Implemented in MVP

| Feature | Tables | Phase |
|---|---|---|
| User accounts with public usernames | `User` | 1 |
| University verification | `University`, `UniversityIdentity` | 1 |
| Blackboard enrollment sync | `Course`, `Enrollment` | 2 |
| Session management | `Authentication`, `Session` | 3 |
| Course discussions | `Thread`, `Message` | 4 |
| Audit logging | `AuditLog` | 5 |
| Role-based permissions (basic) | `Role`, `Capability`, `RoleCapability`, `UserRole` | 5 |

### Deferred to Post-MVP

| Feature | Tables |
|---|---|
| File attachments | `Attachment` |
| Message reactions | `Reaction` |
| Push/email notifications | `Notification` |
| Calendar events | `Event` |
| Advanced moderation queue | `Report` |
| User blocking | `UserBlock` |
| User preferences | `Preference` |
| Read/write database splitting | `DATABASE_READ_URL`, `DATABASE_WRITE_URL` |

---

## 9. Rollback Procedures

### Migration Rollback (Development)

```bash
# Roll back the most recent migration
npx prisma migrate resolve --rolled-back "20260909_120000_create_user_university"
```

### Migration Rollback (Production)

Production migrations are **not rolled back automatically**. If a bad migration is deployed:

1. **Stop the deployment** immediately.
2. **Assess impact** — does the migration break existing data?
3. **Fix forward** (preferred): create a new migration that corrects the issue.
4. **Manual rollback** (last resort): restore from backup and re-apply valid migrations.

### Backup Requirements

- **Automated daily backups** with 30-day retention.
- **Point-in-time recovery (PITR)** enabled for production.
- **Pre-deployment snapshot** before every production migration.

---

## 10. Checklist

### Pre-Implementation

- [ ] PostgreSQL 15+ installed locally.
- [ ] Prisma CLI installed (`npm install -D prisma`).
- [ ] `@prisma/client` installed (`npm install @prisma/client`).
- [ ] `DATABASE_URL` configured in `.env`.
- [ ] `.env` added to `.gitignore`.
- [ ] `.env.example` created with placeholder values.

### Phase Completion Gates

- [ ] Phase 1: Foundation — `User`, `University`, `UniversityIdentity` created and tested.
- [ ] Phase 2: University Integration — `Course`, `Enrollment` created and tested.
- [ ] Phase 3: Authentication — `Authentication`, `Session` created and tested.
- [ ] Phase 4: Community Features — `Thread`, `Message` created and tested.
- [ ] Phase 5: Security and Administration — `AuditLog`, `Role`, `Capability`, `RoleCapability`, `UserRole` created and tested.

### Pre-Production

- [ ] All migrations squashed to a single baseline.
- [ ] Seed data removed from production build.
- [ ] SSL enforced on all database connections.
- [ ] Least-privilege database users configured.
- [ ] Backup and PITR verified.
- [ ] Audit logging operational.
- [ ] Query timeout (`statement_timeout`) configured.

---

## Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1.0 | 2026-09-09 | Schoen Cyber Solutions Engineering | Initial implementation plan |

### Review Schedule

- Before starting database implementation
- After each phase completion
- Before production deployment
- Quarterly standing review

---

*This plan is implementation-focused. It will be updated as engineering learns emerge during development.*
