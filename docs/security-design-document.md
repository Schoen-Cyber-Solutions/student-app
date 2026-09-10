# Security Design Document

## Student App Platform — Schoen Cyber Solutions LLC

**Version:** 0.1.0 (Living Document)  
**Date:** 2026-09-09  
**Status:** Draft — evolves during development  
**Classification:** Internal — Schoen Cyber Solutions Engineering

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Current Architecture](#2-current-architecture)
3. [Implemented Security Features](#3-implemented-security-features)
4. [Identity and Privacy Architecture](#4-identity-and-privacy-architecture)
5. [Username System Security Requirements](#5-username-system-security-requirements)
6. [Data Protection Principles](#6-data-protection-principles)
7. [Future Security Features](#7-future-security-features)
8. [Threat Model](#8-threat-model)
9. [Security Principles](#9-security-principles)
10. [Security Status Summary](#10-security-status-summary)

---

## 1. Project Overview

### Purpose

The **Student App** is a mobile application for university students. Its goal is to create a **verified student community platform** where students can:

- Access university-related information (courses, schedules, announcements)
- View courses and academic information
- Access course communities
- Participate in discussions and chats
- Connect with other students in a pseudonymous, privacy-respecting environment

### Core Security Principle

> A student's university identity is used for **verification and authorization**, but the student's **public identity inside the application is controlled by the student**.

This separation ensures that:
- Students are who they claim to be (verified through university systems)
- Students retain control over how they are represented publicly
- University identity data is never exposed to other students

### Integration Partners

- **Blackboard Learn** — primary university LMS connector
- Future connectors may include Canvas, D2L, Brightspace, Microsoft 365, Google Workspace

---

## 2. Current Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile Application                        │
│                  (Expo / React Native)                       │
│                                                              │
│  • University data stays local on device                     │
│  • App-owned data syncs with backend                         │
│  • No university credentials stored on device               │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ HTTPS
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend API                              │
│              (Node.js / TypeScript / Express)               │
│                                                              │
│  • Security boundary between mobile and university          │
│  • All university credentials server-side only             │
│  • OAuth token management                                   │
│  • Enrollment verification                                  │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ OAuth 2.0 Client Credentials
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              University Connectors                         │
│                                                              │
│  • Blackboard Learn REST API                               │
│  • Future: Canvas, D2L, Microsoft Graph, Gmail API         │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                Blackboard Learn                              │
│                                                              │
│  • User authentication                                      │
│  • Course roster verification                               │
│  • Enrollment confirmation                                  │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Component | Technology | Security Role |
|---|---|---|
| Mobile App | Expo / React Native | Displays data; no secrets stored |
| Backend API | Node.js / Express | Security boundary; credential vault |
| Connectors | TypeScript classes | Normalize external APIs |
| Blackboard | Learn REST API | Source of truth for identity/enrollment |

---

## 3. Implemented Security Features

### 3.1 Secure Backend Architecture

**Status:** ✅ Implemented

The backend acts as a **security boundary** between the mobile application and university systems:

- **Mobile applications do not directly communicate with Blackboard.**
- **Blackboard credentials and secrets remain server-side only.**
- **University API credentials are never stored in the mobile application.**
- All Blackboard API calls are proxied through the backend.
- The mobile app receives only normalized, privacy-scrubbed data.

### 3.2 Blackboard Authentication

**Status:** ✅ Implemented

The backend authenticates with Blackboard Learn using **OAuth 2.0 Client Credentials Flow**:

```
Backend ──POST /learn/api/public/v1/oauth2/token──► Blackboard
  │                                                    │
  │  Authorization: Basic base64(client_id:secret)   │
  │  Content-Type: application/x-www-form-urlencoded   │
  │  Body: grant_type=client_credentials             │
  │                                                    │
  ◄────────────────── access_token ────────────────────│
```

Implemented endpoints:
- `POST /learn/api/public/v1/oauth2/token` — token acquisition
- `GET /learn/api/public/v1/users?userName={username}` — user lookup
- `GET /learn/api/public/v1/users/{userId}/courses` — course membership lookup

**Key files:**
- `src/connectors/blackboard/auth.ts`
- `src/connectors/blackboard/users.ts`
- `src/connectors/blackboard/courses.ts`

### 3.3 Secret Management

**Status:** ✅ Implemented

| Control | Status | Detail |
|---|---|---|
| Environment variables | ✅ | All secrets loaded from `.env` |
| Git exclusion | ✅ | `.env` in `.gitignore` |
| Template provided | ✅ | `.env.example` documents required variables |
| No hardcoded secrets | ✅ | No credentials in source code |
| No secrets in GitHub | ✅ | Verified through `.gitignore` |

**Required environment variables:**
```
BLACKBOARD_URL=https://schoen-blackboard.ddns.net
BLACKBOARD_CLIENT_ID=<client-id>
BLACKBOARD_CLIENT_SECRET=<client-secret>
```

### 3.4 Authorization Through University Enrollment

**Status:** ✅ Implemented

The backend can verify:

1. **User exists in Blackboard**
   - `getUserByUsername(username)` → `BlackboardUser`
   - Returns: id, userName, studentId, name, email, availability

2. **User is enrolled in a specific course**
   - `getUserCourses(userId)` → `BlackboardCourseMembership[]`
   - Returns: id, userId, courseId, courseRoleId, availability

3. **User's role inside the course**
   - `courseRoleId` (e.g., "Student", "Instructor", "TeachingAssistant")

**Example verification flow:**

```
Student: Emily
Blackboard User ID: _7_1
Enrolled in: CSIA308
Role: Student

Backend verifies:
1. emily.test exists in Blackboard? ✅
2. emily.test is enrolled in CSIA308? ✅
3. emily.test has role "Student" in CSIA308? ✅
4. Grant access to CSIA308 course community. ✅
```

---

## 4. Identity and Privacy Architecture

### Three-Layer Identity Model

```
┌─────────────────────────────────────────────────────────────┐
│                  UNIVERSITY IDENTITY                        │
│                   (Private / Internal)                      │
│                                                              │
│  • University email address                                  │
│  • Blackboard user ID (_7_1)                              │
│  • Real legal name (Emily Schoen)                          │
│  • Student ID number                                       │
│  • Enrollment records                                      │
│                                                              │
│  NEVER displayed publicly.                                 │
│  Used only for:                                            │
│   - Authentication                                         │
│   - Verification                                           │
│   - Authorization                                          │
└──────────────────────┬─────────────────────────────────────┘
                       │
                       │ Backend maps university identity
                       │ to internal identity
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                INTERNAL APPLICATION IDENTITY              │
│                   (Backend-only / Private)                  │
│                                                              │
│  • Internal UUID (app-generated)                           │
│  • Link to university identity (one-way mapping)         │
│  • Verification status (verified / pending)              │
│  • Account creation timestamp                              │
│                                                              │
│  NEVER displayed to other users.                           │
│  Used for:                                                 │
│   - Database relationships                                 │
│   - Audit logging                                          │
│   - Account recovery                                       │
└──────────────────────┬─────────────────────────────────────┘
                       │
                       │ Student creates / controls
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  PUBLIC APPLICATION IDENTITY                │
│                   (Visible to all users)                    │
│                                                              │
│  • Public username (e.g., "CyberFox27")                  │
│  • Avatar / profile picture                                │
│  • Program / year (optional, student-controlled)            │
│  • Bio (optional, student-controlled)                       │
│                                                              │
│  Other students ONLY see this layer.                       │
│  No connection to legal identity without consent.          │
└─────────────────────────────────────────────────────────────┘
```

### Privacy Guarantees

| Data | Visibility | Controlled By |
|---|---|---|
| University email | Backend only | University |
| Blackboard ID | Backend only | University |
| Legal name | Backend only | University |
| Student ID | Backend only | University |
| Enrollment records | Backend only | University |
| Internal UUID | Backend only | App |
| Public username | All users | Student |
| Profile info | All users | Student |
| Chat messages | Course community | Student |

---

## 5. Username System Security Requirements

### 5.1 Core Requirements

| Requirement | Status | Detail |
|---|---|---|
| Freely selectable | 🔄 Planned | Student chooses their own username |
| No real name required | 🔄 Planned | Username independent of legal identity |
| No email exposure | ✅ Enforced | Email never displayed |
| No Blackboard ID exposure | ✅ Enforced | Internal IDs never displayed |
| No legal identity exposure | ✅ Enforced | Real names never displayed |

### 5.2 Username Change Policy

| Aspect | Status | Detail |
|---|---|---|
| Change allowed | 🔄 Planned | Users can change username |
| Change limits | 🔄 Planned | Rate-limited to prevent abuse |
| History retention | 🔄 Planned | Username history kept for moderation |
| Previous username lock | 🔄 Planned | Old usernames reserved for cooldown period |

### 5.3 Username Validation Rules

**Planned rules:**

| Rule | Constraint |
|---|---|
| Allowed characters | Alphanumeric, underscore, hyphen, dot |
| Minimum length | 3 characters |
| Maximum length | 30 characters |
| Case sensitivity | Lowercase enforced for uniqueness |
| Prohibited patterns | Impersonation of staff, admin, official accounts |
| Reserved names | "admin", "support", "official", "university", "blackboard" |
| Slur / hate speech | Blocked via word list + ML review |
| Impersonation | Prevention of names that mimic other users |
| Special characters | No control characters, no zero-width characters |
| Consecutive special chars | Max 2 consecutive dots/underscores/hyphens |
| Leading/trailing | No leading or trailing dots, underscores, hyphens |

### 5.4 Moderation System

| Feature | Status | Detail |
|---|---|---|
| Report user | 🔄 Planned | Report inappropriate behavior |
| Report username | 🔄 Planned | Report impersonation / offensive name |
| Block user | 🔄 Planned | Prevent interaction |
| Admin review queue | 🔄 Planned | Human moderation interface |
| Automated flagging | 🔄 Planned | ML-based detection of offensive usernames |
| Suspension | 🔄 Planned | Temporary or permanent |
| Appeal process | 🔄 Planned | Students can appeal moderation decisions |

---

## 6. Data Protection Principles

### 6.1 Privacy by Design

**Implemented:**
- ✅ University data stays on-device where practical (courses, schedules)
- ✅ Backend normalizes all external data before sending to mobile
- ✅ External provider IDs (`externalRefs`) never used as primary keys
- ✅ External provider IDs never displayed to users

**Planned:**
- 🔄 Data retention policies (automatic deletion after account closure)
- 🔄 User data export capability (GDPR/CCPA compliance)
- 🔄 User data deletion capability (right to be forgotten)

### 6.2 Data Minimization

**The system does NOT store:**

| Data Type | Status | Rationale |
|---|---|---|
| Grades | ❌ Never | Not required for community features |
| Assignment submissions | ❌ Never | Not required for community features |
| Private university records | ❌ Never | Outside scope of app |
| Full email inbox mirror | ❌ Never | Email connector is read-only, on-demand |
| LMS content mirror | ❌ Never | Connector fetches on-demand, minimal cache |

**The system MAY store (with consent):**

| Data Type | Status | Rationale |
|---|---|---|
| Course enrollment list | 🔄 Planned | Required for course community access |
| User profile (username, avatar) | 🔄 Planned | Required for community participation |
| Chat messages | 🔄 Planned | Required for course communities |
| Verification status | 🔄 Planned | Required for trust model |

### 6.3 Encryption

| Layer | Status | Detail |
|---|---|---|
| Transit (mobile ↔ backend) | 🔄 Planned | HTTPS / TLS 1.3 |
| Transit (backend ↔ Blackboard) | ✅ Implemented | HTTPS via axios |
| At rest (database) | 🔄 Planned | AES-256 encryption |
| At rest (secrets) | 🔄 Planned | AWS Secrets Manager or equivalent |
| Database credentials | 🔄 Planned | Rotated regularly, never in source |
| Auth tokens (mobile) | 🔄 Planned | Secure storage (Keychain / Keystore) |
| Auth tokens (backend) | 🔄 Planned | Short-lived, rotated |

---

## 7. Future Security Features

### 7.1 Student Authentication

| Feature | Status | Priority |
|---|---|---|
| University login flow | 🔄 Planned | High |
| Blackboard 3-legged OAuth / OIDC | 🔄 Planned | High |
| JWT session tokens | 🔄 Planned | High |
| Token expiration handling | 🔄 Planned | High |
| Token rotation | 🔄 Planned | Medium |
| Refresh token flow | 🔄 Planned | Medium |
| Logout / token revocation | 🔄 Planned | Medium |
| Session timeout | 🔄 Planned | Medium |
| Concurrent session limits | 🔄 Planned | Low |
| Multi-factor authentication (MFA) | 🔄 Planned | Low (post-MVP) |

### 7.2 API Security

| Feature | Status | Priority |
|---|---|---|
| Authentication middleware | 🔄 Planned | High |
| Authorization middleware | 🔄 Planned | High |
| Role-based access control (RBAC) | 🔄 Planned | High |
| Rate limiting | 🔄 Planned | High |
| Input validation (Joi / Zod) | 🔄 Planned | High |
| Secure error handling (no stack traces to client) | 🔄 Planned | Medium |
| API request logging | 🔄 Planned | Medium |
| API response logging (sanitized) | 🔄 Planned | Medium |
| CORS configuration | 🔄 Planned | Medium |
| Request ID tracing | 🔄 Planned | Low |
| API versioning | 🔄 Planned | Low |

### 7.3 Database Security

**Planned database entities:**

```
Users
  - internal_user_id (UUID, PK)
  - blackboard_user_id (encrypted, indexed)
  - university_id (FK)
  - username (unique, indexed)
  - verification_status (enum)
  - created_at, updated_at

Universities
  - university_id (UUID, PK)
  - name
  - domain
  - blackboard_url
  - lms_provider
  - email_provider
  - created_at

Courses
  - course_id (UUID, PK)
  - university_id (FK)
  - blackboard_course_id (encrypted)
  - name
  - code
  - created_at

Enrollments
  - enrollment_id (UUID, PK)
  - user_id (FK)
  - course_id (FK)
  - role (Student / Instructor / TA)
  - verified_at
  - created_at

Messages
  - message_id (UUID, PK)
  - thread_id (FK)
  - author_id (FK → Users.internal_user_id)
  - content (encrypted at rest)
  - created_at
```

### 7.4 Production Secrets Management

| Control | Status | Detail |
|---|---|---|
| AWS Secrets Manager / Azure Key Vault | 🔄 Planned | Production secret storage |
| Automatic secret rotation | 🔄 Planned | Rotate OAuth credentials periodically |
| Least privilege IAM | 🔄 Planned | Service accounts with minimal permissions |
| Secret access audit logging | 🔄 Planned | Log all secret access |
| Runtime injection | 🔄 Planned | Secrets injected at runtime, never in images |

---

## 8. Threat Model

### STRIDE-Inspired Analysis

| # | Threat | Category | Risk | Mitigation | Status |
|---|---|---|---|---|---|
| 1 | **Unauthorized course access** | Authorization | High | Backend verifies enrollment through Blackboard before granting community access | ✅ Implemented |
| 2 | **Identity exposure** | Information Disclosure | High | Public usernames are completely separate from university identity; no university data leaked to other students | ✅ Implemented |
| 3 | **Credential exposure** | Information Disclosure | Critical | Blackboard API credentials stored server-side only in environment variables; never in mobile app or source code | ✅ Implemented |
| 4 | **Account takeover** | Authentication | High | Secure OAuth flow; future JWT sessions with expiration; future MFA support | 🔄 Partial |
| 5 | **API abuse / scraping** | Denial of Service | Medium | Rate limiting on all endpoints; authentication required for sensitive endpoints; monitoring for anomalous traffic | 🔄 Planned |
| 6 | **Malicious usernames** | Repudiation / Elevation | Medium | Username validation rules; reporting system; human moderation queue; automated flagging | 🔄 Planned |
| 7 | **Tampered enrollment data** | Tampering | Medium | University systems are source of truth; backend re-verifies enrollment on-demand; no cached enrollment trusted without expiry | ✅ Implemented |
| 8 | **Backend compromise** | Elevation of Privilege | Critical | Secrets not in source code; minimal attack surface; no direct database exposure; infrastructure hardening | 🔄 Planned |
| 9 | **Man-in-the-middle (mobile ↔ backend)** | Information Disclosure | High | HTTPS/TLS for all communication; certificate pinning considered for mobile | 🔄 Planned |
| 10 | **Man-in-the-middle (backend ↔ Blackboard)** | Information Disclosure | Medium | HTTPS enforced by axios; Blackboard certificate validation | ✅ Implemented |
| 11 | **Replay attacks** | Tampering | Low | JWT tokens with short expiry; nonce validation for sensitive operations | 🔄 Planned |
| 12 | **Data breach (database)** | Information Disclosure | High | Encryption at rest; least privilege database access; regular backups; breach notification procedures | 🔄 Planned |
| 13 | **Insider threat** | Elevation of Privilege | Medium | Role-based access control; audit logging; principle of least privilege | 🔄 Planned |
| 14 | **Chat content abuse** | Repudiation | Medium | Content moderation; reporting; automated toxicity detection; message retention policies | 🔄 Planned |

### Risk Matrix

```
Impact
  High │  API abuse        Account takeover   Backend compromise
       │  Data breach      Credential leak
       │
       │  Unauthorized     Identity exposure
 Medium│  course access    Malicious usernames
       │  Tampered data     Chat abuse
       │
  Low  │  Replay attacks
       │
       └─────────────────────────────────────────────────────►
              Low              Medium              High
                            Likelihood
```

---

## 9. Security Principles

### Applied Principles

| Principle | Application |
|---|---|
| **Defense in Depth** | Multiple layers: mobile app → backend → Blackboard; each layer has its own controls |
| **Least Privilege** | Backend uses minimal Blackboard permissions; connectors only access required data |
| **Zero Trust** | Never trust the client; always verify enrollment with university systems |
| **Privacy by Design** | Identity separation from the ground up; data minimization enforced |
| **Secure by Default** | No public endpoints without authentication (future); secrets excluded from Git by default |
| **Minimal Data Collection** | Only store data required for app functionality; grades and private records excluded |
| **Separation of Authentication and Authorization** | Blackboard proves identity; backend independently checks authorization (enrollment) |
| **Secure SDLC** | TypeScript strict mode; type checking in CI; code review required; secrets scanning |

---

## 10. Security Status Summary

### ✅ Completed

| Feature | Description | Evidence |
|---|---|---|
| Blackboard OAuth integration | Client credentials flow working | `src/connectors/blackboard/auth.ts` |
| Blackboard REST API integration | Users and courses endpoints working | `src/connectors/blackboard/users.ts`, `courses.ts` |
| User lookup by username | `GET /learn/api/public/v1/users?userName=` | Tested with `emily.test` |
| Course membership verification | `GET /learn/api/public/v1/users/{id}/courses` | Tested with `_7_1` |
| Backend security boundary | Mobile never talks to Blackboard directly | Architecture enforced |
| Environment-based secret management | `.env` + `dotenv/config` | `src/config/index.ts` |
| Git security practices | `.env` in `.gitignore`, `.env.example` provided | `.gitignore`, `.env.example` |
| Type safety | TypeScript strict mode | `tsconfig.json` |
| Error handling | No stack traces or secrets in error messages | `src/connectors/blackboard/*.ts` |

### 🔄 In Progress

| Feature | Current State | Next Steps |
|---|---|---|
| Backend API design | Express router for `/api/courses` created | Add remaining endpoints; add middleware |
| User identity architecture | Three-layer model documented | Implement database schema |
| Database architecture | Entity model defined in security doc | Create migrations; implement ORM |
| API route structure | Health check + courses endpoint | Add auth, users, chat endpoints |
| Connector architecture | Blackboard connector functional | Add Canvas, D2L, Microsoft connectors |

### 📝 Planned

| Feature | Target Quarter | Priority |
|---|---|---|
| Student authentication (JWT sessions) | Q4 2026 | High |
| Username system (creation, validation, changes) | Q4 2026 | High |
| Database implementation (PostgreSQL) | Q4 2026 | High |
| Chat authorization (course-based access) | Q1 2027 | High |
| HTTPS/TLS for all communication | Q4 2026 | High |
| Encryption at rest (database) | Q1 2027 | High |
| Rate limiting | Q1 2027 | Medium |
| Input validation middleware | Q1 2027 | Medium |
| API logging and monitoring | Q1 2027 | Medium |
| Production secrets manager (AWS) | Q1 2027 | Medium |
| Multi-factor authentication (MFA) | Q2 2027 | Low |
| Content moderation (chat) | Q2 2027 | Medium |
| Security audit / penetration testing | Q2 2027 | Medium |
| Compliance review (GDPR/FERPA) | Q2 2027 | Medium |

---

## Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1.0 | 2026-09-09 | Schoen Cyber Solutions Engineering | Initial draft |

### Review Schedule

This document will be reviewed:
- After each major security feature implementation
- Before production deployment
- Quarterly as a standing practice
- After any security incident

### Distribution

- Engineering team (full access)
- Product team (overview sections)
- Security advisor (full access, audit trail)

---

*This is a living document. Security is an ongoing process, not a destination.*
