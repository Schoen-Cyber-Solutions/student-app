# Academic Setup Architecture — Security Design

## Student App Platform — Schoen Cyber Solutions LLC

**Status:** Implemented (MVP)
**Companion to:** `security-design-document.md`

This document covers the university-driven academic setup architecture:
official class-schedule ingestion, explicit CourseSection enrollment,
section/university communities, and the revised trust model where the LMS
feed is calendar content only.

---

## 1. Trust Model

### Authoritative sources

| Claim | Authoritative source | Never authoritative |
|---|---|---|
| University membership | Verified `UniversityIdentity` (email challenge) | Client-supplied `universityId` |
| Course/section existence | Official university schedule (Course Finder) | LMS feed, user input |
| Course membership | `Enrollment.verificationSource = "student_selection"` | LMS feed signals, event titles |
| Section community access | Active `Enrollment.courseSectionId` | Frontend state, `CourseColor`, `CalendarEvent` |
| University community access | Verified `UniversityIdentity.universityId` | Anything else |
| Class meeting times | `CourseSectionMeeting` from official schedule | Manual events, LMS events |
| Assignments/due dates | LMS ICS feed (display only) | — |

### The LMS boundary

The Blackboard/Canvas ICS feed imports **calendar content only**. Feed course
signals (`detectCourses`) may *label* an event with an existing enrollment's
Course/CourseSection when the code matches exactly one active enrolled
section — they can never create `Course` rows or `Enrollment` rows. Generic
titles ("Quiz 1", "Assignment 2") and ambiguous codes stay unassigned.

Legacy `blackboard_api`/`calendar_feed` enrollments are preserved as records
but grant nothing: community authorization requires `courseSectionId`.

---

## 2. Authorization Matrix

| Resource | Authorization check | Failure mode |
|---|---|---|
| `GET /me/academic/*` | Verified `UniversityIdentity` | 404 |
| `PATCH /me/academic/profile` | Verified identity; `programId`/`currentTermId` validated against same university | 400 invalid / 404 unverified |
| `POST /me/academic/enrollments` | Verified identity; section exists, `isActive`, term active, course active, `course.universityId === identity.universityId` | 404 uniform |
| `DELETE /me/academic/enrollments/:id` | `enrollment.userId === req.user.id` | 404 |
| `GET /me/communities` | Verified identity (empty list otherwise) | 200 [] |
| `GET/POST /me/communities/uni:{id}/threads` | `identity.universityId === id` | 404 |
| `GET/POST /me/communities/sec:{id}/threads` | Active enrollment for section `id` | 404 |
| `GET/POST/DELETE /me/threads/:id` | Thread's stored scope → same checks | 404 |
| `DELETE /me/messages/:id` | Author only; first message → delete thread | 404 / 409 |
| `GET /me/courses` | Active enrollment (section or legacy) | — |
| `POST /me/calendar/*` | Session only; feed URL user-owned | 400/404 |

All unauthorized/forbidden paths return a uniform 404 — probing cannot
distinguish "does not exist" from "wrong tenant".

---

## 3. Data Classification

| Data | Classification | Exposure |
|---|---|---|
| University email | Private (verification only) | Never in API responses |
| `blackboardUserId`, provider ids | Private | Never exposed |
| ICS feed URL | Secret | AES-256-GCM at rest; never returned or logged |
| Session tokens | Secret | SHA-256 hash only at rest |
| Birth month/day | Private profile | `GET /me` only (self) |
| `firstName` | Private profile | `GET /me` only (self) |
| Username | Public identity | Communities, threads, messages |
| Course/section/schedule data | Public (official source) | Scoped to verified members |
| Enrollments | Semi-private | Self + drives community access (member lists not exposed) |
| Instructor names | Public (university source) | Section search |
| `termCode`, `externalSectionId` (CRN) | Internal | Never in API responses |
| Program/term lists | Public | Verified members |
| `UniversityDataSource.sourceUrl` | Internal config | Never exposed; never client-settable |

---

## 4. Threat Model (new threats & mitigations)

| # | Threat | Mitigation |
|---|---|---|
| T1 | Student submits a `courseSectionId` belonging to another university | Server derives university from verified identity; section's `course.universityId` must match; uniform 404 |
| T2 | Client supplies `universityId`/`sourceUrl`/`verificationSource` in request bodies | Fields ignored; `verificationSource` hard-set to `student_selection`; provider URLs come only from `UniversityDataSource` config |
| T3 | SSRF via user-controlled source URL | No endpoint accepts a provider URL. Course Finder base URL is fixed server config (`RooseveltScheduleProvider.BASE_URL`) |
| T4 | Malicious/malformed schedule HTML poisons the database | Parser strips tags incl. `<script>`/`<style>`; all values length-capped and shape-validated; rows failing class-identity parse are skipped; sync is upsert-based (no dupes) |
| T5 | Guessing section/university community ids | Uniform 404 via `authorizeCommunity` — no existence oracle |
| T6 | Duplicate enrollment race | `@@unique([userId, courseSectionId])` + upsert → idempotent |
| T7 | Stale access after unenrollment | Deletion deactivates enrollment, deletes generated `course_schedule` events, and community authz re-checks `isActive` on every request |
| T8 | LMS feed creates phantom membership | Enrollment creation removed from feed sync entirely (see §1) |
| T9 | Feed event mislabeled to wrong section | Section link only when code maps to exactly one active enrolled section; otherwise course-less |
| T10 | Abuse of enrollment endpoints | 30 changes/hour per user rate limit; thread/message limits unchanged |
| T11 | API leaks private fields | Response shapes whitelist fields; smoke test asserts no email/feedUrl/termCode/provider ids |
| T12 | Secrets in logs | No route logs request bodies, tokens, feed URLs, or provider URLs |

---

## 5. Ingestion Security (Roosevelt Course Finder)

- **Fixed request template.** The 17-field ordered contract is built from a
  constant table (`requestTemplate.ts`); only `TERM` and `SUBJ` vary, and both
  are normalized server-side (`SUBJ` uppercased, `%` for all).
- **Server-side fetch only.** `RooseveltScheduleProvider` owns the base URL;
  timeouts (20s) and a single retry; identifiable `User-Agent`.
- **Politeness.** Per-subject sync with a 30-minute freshness TTL; terms sync
  with a 6-hour TTL. The all-subject fetch is never issued per user request.
- **Parser isolation.** `parseCourseFinder`/`parseMeetings`/`parseTerms` are
  pure functions on strings — no fetch, no DB, no eval, no HTML rendering.
- **External content stays text.** Descriptions are stored as plain text and
  rendered via React Native `<Text>` — never as HTML.

---

## 6. Verification

- `tests/rooseveltParser.test.ts` — 19 tests over real saved fixtures:
  terms, 15 CSIA sections, CRN/session/credits/instructor extraction,
  multi-meeting, online/TBA/ZOOM, 3A/3B sessions, malformed input safety,
  script stripping, ordered request template.
- `tests/authz.smoke.ts` — 21 end-to-end checks against the live Express app:
  cross-university section 404, forged fields ignored, fabricated id 404,
  idempotent enrollment, cross-user delete 404, section/community/thread
  authorization, calendar cleanup, privacy field assertions.

Physical device verification of the onboarding → section → calendar →
community flow is pending (see final report).
