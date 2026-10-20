# Study with Emy — App Store Launch Readiness Audit

**Date:** 2026-10-19
**Audited:** `student-app-development` @ `ac72f18` · `student-backend` @ `36c5ac5`
**Method:** Static review of all source, config, routes, tests, generated iOS project; automated checks; live URL/API probes; current Apple App Review Guidelines. No code or config was changed.

---

## 1. Executive summary

The codebase is in strong shape technically. Authentication, sessions, account deletion, chat + image upload, calendar, and moderation are implemented to a real production standard with 355 passing automated tests. The app is **not yet safe to submit** for a small number of concrete reasons — most of them metadata, wiring, or App Review logistics rather than code defects.

**Confirmed launch blockers (P0/P1):**

1. **No demo access for App Review.** Sign-in requires a verifiable university email + emailed code. Reviewers cannot enter the app without a real university mailbox → almost certain 2.1 "app completeness" rejection if not addressed (demo account or demo mode + review notes).
2. **No privacy-policy/terms links inside the app.** Guideline 5.1.1(i) requires the privacy policy accessible within the app, not just in metadata. The pages exist and are live on the website — they are just not linked in-app.
3. **Email Compose is a stub.** The inbox's compose button opens a screen that dismisses without sending (`// Prototype: no real send`). A visible dead-end feature risks a 2.1 rejection — hide or implement before submission.
4. **No published contact/support info in-app.** Guideline 1.2 requires users can reach the developer; the support page exists on the website but the app only links the bare domain.
5. **Team-ID change consequence (new this session):** the device build now signs under `5ZULG5R92Y`, but an older personal-team (`ANB9VFSZ7M`) build is installed on the dev iPhone — iOS refuses the upgrade (`MismatchedApplicationIdentifierEntitlement`). Delete the old app on-device before installing; for App Store release this is a non-issue but note it for TestFlight/dev installs.

**Good news:** the code-signing problem from earlier this week is resolved — the device build compiled and signed successfully under the LLC team.

Everything else is polish or metadata: export-compliance flag, permission-string cleanup, iPad decision, App Store Connect metadata, TestFlight pass.

---

## 2. Feature inventory

| Feature / Requirement | Status | Evidence | Priority | Required Action |
|---|---|---|---|---|
| University email verification (send code) | COMPLETE | `src/services/emailVerification.ts` — scrypt-hashed 6-digit codes, 10-min TTL, timing-safe compare, request+verify rate limits, generic anti-enumeration responses; UI `app/onboarding.tsx` | — | Verify Resend env on prod |
| Login / sessions / logout | COMPLETE | `src/services/sessionService.ts` — 256-bit tokens, SHA-256-hashed at rest, 30-day TTL; `requireAuth` uniform 401s; SecureStore on device (`services/auth/devSession.ts`) | — | — |
| Registration / onboarding profile setup | COMPLETE | `POST /api/me/profile/setup`, `app/setup.tsx` | — | Add terms acceptance step (P1, see §4) |
| User profile + birthday | COMPLETE | `utils/birthday.ts` shared parser, `profile-edit.tsx`, PATCH `/me/profile`; null-clearing fixed in `36c5ac5`. MM/DD ints — no timezone risk | — | — |
| Home dashboard | COMPLETE | `app/(tabs)/index.tsx` — loading/error/empty states all present | — | — |
| Calendar Day/Week/Month + settings | COMPLETE | `DayView`/`WeekTimetable`/`MonthView`, `utils/calendarRange*.ts`, SecureStore persistence, live-update store; wheel-selection fix in `44a7298` | — | Physical-device confirm |
| LMS calendar sync (Blackboard/Canvas iCal) | PARTIAL | `calendar-connect.tsx`, `/calendar/connect`, `/calendar/sync`, `safeExternalFetch` (SSRF-guarded), encrypted feed storage. Real feeds unverifiable without user accounts | P1 | Verify with a real feed pre-launch |
| Blackboard REST connector | PARTIAL | `src/connectors/blackboard/` complete; wired to `routes/courses.ts`. Requires `BLACKBOARD_*` envs + a live instance — unverified | P2 | Verify prod config or defer |
| Chat communities / threads / messages | COMPLETE | `routes/courseCommunities.ts` full CRUD + search; membership gated to enrollment | — | — |
| Chat image upload | COMPLETE | Foreground URLSession fix (`44a7298`), magic-byte + dimension + 8MB limits server-side, attachment lifecycle on deletion | — | Physical-device confirm |
| Email integration (Microsoft) | PARTIAL | OAuth + encrypted token storage + inbox read: `services/microsoft/`, `/integrations/microsoft/*`, `app/uni-email/`. **Compose is a stub** (`compose.tsx:38` "Prototype: no real send") | P1 | Hide or implement compose; verify prod Azure app |
| Campus events | COMPLETE | `/api/me/events*`, `app/events/*`, save/unsave | — | — |
| Emy welcome + helpers | COMPLETE | `emy-welcome.tsx`, `EmySheet/EmyHelp`, first-launch flag | — | — |
| Settings / Light & Dark / blocked users | COMPLETE | `settings.tsx`, `blocked-users.tsx`, appearance persistence | — | — |
| Moderation: report / block / admin queue / suspend | COMPLETE | `routes/moderation.ts`, `routes/admin.ts`, `app/admin/*`, `useModeration`; admin UI exists in-app | — | — |
| Proactive UGC content filtering | PARTIAL | `src/services/moderation.ts` is report/block only — no automated filter | P1 | Acceptable per 1.2 reading, but plan response SLA + consider a filter list |
| Account deletion | COMPLETE | `DELETE /api/me/account`, `accountDeletion.ts` — tombstone + anonymize + media purge; UI `delete-account.tsx` | — | Satisfies 5.1.1(v) |
| Push notifications | MISSING | No `expo-notifications` dependency; no APNs wiring | P3 | Defer to v1.1 or implement pre-launch decision |
| Offline behavior | PARTIAL | No NetInfo; per-screen error/empty/retry states exist (`EmptyState`, `status==='error'`) | P2 | Acceptable for v1.0 |
| Accessibility | UNVERIFIED | `accessibilityLabel` present in places; no audit of labels/contrast done on-device | P2 | VoiceOver pass on device |

## 3. Security & privacy findings

**Strengths (verified):**

- Session tokens: 256-bit entropy, SHA-256-hashed at rest, uniform 401 on any failure — `sessionService.ts`, `requireAuth.ts`.
- Verification codes: scrypt+salt, timing-safe compare, max 5 attempts, request rate limits per email + hashed-IP — `emailVerification.ts`.
- Backend hardening: `x-powered-by` off, `nosniff`/`DENY`/`no-referrer` headers, HSTS in prod, 100kb JSON limit, `trust proxy=1`, generic 500 boundary, fail-fast config validation — `src/app.ts`, `src/index.ts`.
- Secrets at rest: calendar feed URLs and Microsoft tokens AES-GCM-encrypted (`CALENDAR_FEED_ENCRYPTION_KEY`, `MICROSOFT_TOKEN_ENCRYPTION_KEY` + rotation keys); chat media stored by opaque key, not URL.
- SSRF protection on user-supplied feed URLs — `safeExternalFetch.ts`.
- Account deletion: thorough delete/tombstone/anonymize including media-file purge — `accountDeletion.ts`.
- Frontend: session token in SecureStore; `.env.local` gitignored; no secrets in any diff reviewed.
- No tracking, no ads, `NSPrivacyTracking=false`, app-level `PrivacyInfo.xcprivacy` present with standard Expo accessed-API reasons.

**Issues:**

| Finding | Severity | Evidence |
|---|---|---|
| No in-app privacy-policy link | P1 | Guideline 5.1.1(i) requires it within the app; only `about.tsx` → domain root |
| No in-app support/contact info | P1 | Guideline 1.2 "published contact information" — support page exists at `schoencybersolutions.com/student-app/support/` (200, verified) but unlinked |
| Unused permission keys with generic strings | P2 | `Info.plist` carries `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, `NSFaceIDUsageDescription`, `NSLocalNetworkUsageDescription` (dev-launcher). Photo library string is also the generic Expo default |
| `test-blackboard.ts` stray script in `src/` | P3 | Hardcoded test username; server-side only — hygiene |
| Third-party SDK data collection | LOW | Only Microsoft Graph (user-consented OAuth) + Resend (server-side email) + optional S3 storage. Privacy nutrition labels must declare: email, name, user content, identifiers — see §4 |

**Data-collection inventory for App Privacy labels:** email address (verification), name/username, university affiliation, UGC (threads/messages/images), academic data (enrollments, schedule), MS email content if connected (read from user's mailbox — declared as user content), support interactions. None sold/shared; tracking = No.

## 4. Apple App Store compliance

Source: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (fetched today).

| Requirement | Guideline | Status | Evidence / Action |
|---|---|---|---|
| App completeness; demo account or demo mode | 2.1 | **P0 BLOCKER** | "include demo account info... if your app includes a login." University-email login gives reviewers no path in. **Action:** provide a review demo mailbox + code path, or a demo mode ([docs](https://developer.apple.com/help/app-store-connect/reference/app-information-and-submission/)) — prior-approval demo mode only if account is truly impossible |
| Privacy policy link **in-app** + metadata | 5.1.1(i) | **P1** | `https://schoencybersolutions.com/student-app/privacy/` → 200 ✅ but no in-app link |
| Account deletion in-app | 5.1.1(v) | ✅ COMPLETE | `delete-account.tsx` + `DELETE /api/me/account` |
| Sign in with Apple | 4.8 | ✅ NOT REQUIRED | App uses its own account system exclusively; Microsoft OAuth is a data integration, not primary sign-in — exemption applies |
| UGC: filtering / report / block / contact | 1.2 | PARTIAL → **P1** | Report ✅ Block ✅ Admin queue ✅. Missing: published contact in-app; no proactive filter (reactive likely acceptable) |
| Purpose strings match usage | 5.1.1(ii)/(iii) | PARTIAL → **P2** | Remove unused camera/mic/FaceID keys; make photo-library string descriptive; dev-launcher `NSLocalNetworkUsageDescription` will ship in release builds — strip dev-client for store build |
| Age rating questionnaire | 2.3.6 | UNVERIFIED → P1 | UGC chat + messaging → expect **17+** (or restricted-social feature gating); must answer honestly in App Store Connect |
| Export compliance (encryption) | — | MISSING → P2 | No `ITSAppUsesNonExemptEncryption` in `ios.infoPlist`; standard HTTPS/AES — declare `false` or answer exemption in ASC. [docs](https://developer.apple.com/help/app-store-connect/reference/export-compliance-and-encryption) |
| App privacy "nutrition labels" | 5.1.1 | METADATA → P1 | Must be completed in App Store Connect before submission ([docs](https://developer.apple.com/app-store/app-privacy-details/)) |
| Metadata completeness (screenshots, description, keywords, support URL, category) | 2.1/2.3 | METADATA → P1 | Not yet created in ASC; website support URL is live ✅ |
| Terms/EULA presented in app | 1.2 (implicit) | MISSING → P1 | Website terms live (`/student-app/terms/` 200 ✅); no acceptance step or link in app — add link in onboarding + settings |
| Community guidelines URL 404 | 1.2 | MINOR | `/student-app/guidelines` 404s on the deployed site — publish or rely on Terms |
| Placeholder/stub content | 2.1 | **P1** | Email compose stub — visible dead end |

## 5. Build & release configuration

| Item | Status | Evidence |
|---|---|---|
| Bundle identifier | ✅ | `com.schoencybersolutions.studentapp` — app.json, Xcode project, provisioning profile consistent |
| Team ID | ✅ | `5ZULG5R92Y` = SCHOEN CYBER SOLUTIONS LLC (cert `O=` + provisioning profile verified); `app.json`, regenerated `ios/`, and profile all agree. `ANB9VFSZ7M` confirmed as personal team, now removed |
| Expo SDK / RN / deps | ✅ | SDK `~57.0.30`, RN `0.86.3`, all expo packages pinned to SDK-matched versions; `enableSceneSupport` for iOS 27 |
| Xcode / SDK | ✅ | Xcode 27.1 installed; device build compiled + signed |
| eas.json | ✅ + gap | dev→LAN, preview/production→Railway prod URL; `autoIncrement` on. **No `submit` block** — submission is manual (acceptable) |
| Release API endpoint | ✅ | `EXPO_PUBLIC_API_BASE_URL=https://student-backend-production-11111.up.railway.app` baked in via eas.json env |
| Icons / splash | ✅ | `icon.png`, `emy-icon.png` splash, adaptive icons present |
| Info.plist | PARTIAL | Encryption flag missing; unused permission keys; URL scheme `studentappdevelopment` is dev-named (cosmetic) |
| Privacy manifest | ✅ | `PrivacyInfo.xcprivacy` generated with standard Expo API reasons |
| Entitlements | ✅ | Empty — no APNs/SIWA needed currently |
| expo-dev-client in deps | P2 | Dev menu/launcher code + `NSLocalNetworkUsageDescription` ship in release builds unless excluded — strip or accept review risk of odd permission text |
| Signing/device install | **P1 (ops)** | `errSecInternalComponent` RESOLVED (build signed at 13:10). New install failure: `MismatchedApplicationIdentifierEntitlement` — **delete the old personal-team build from the iPhone first**. This also applies to any existing TestFlight/dev installs; store installs are unaffected |
| iPad | DECIDE | `supportsTablet: true` → iPad screenshots + functional iPad build required, untested. Consider `false` for v1.0 (P2) |
| Railway deploy of `36c5ac5` | UNVERIFIED | Pushed to `main`; `/health` returns ok but exposes no version. Confirm rollout in Railway dashboard before submission (backend must be live during review — 2.1) |

## 6. Automated check results

| Check | Result |
|---|---|
| Frontend `tsc --noEmit` | ✅ clean |
| Frontend `vitest run` | ✅ **196/196** (20 files: calendar range, birthday, moderation, theme, timeline geometry, etc.) |
| Backend `tsc --noEmit` | ✅ clean |
| Backend `tsx --test` (correct runner — vitest is not configured there) | ✅ **159/159** |
| `expo config` | ✅ resolves name/bundleId/teamId/scene support correctly |
| Website legal pages | ✅ privacy/terms/support → 200; guidelines → 404 |
| Backend `/health` | ✅ 200 on production |

Everything automated passes. **What is NOT proven by this:** physical-device behavior (calendar wheels, image upload, OAuth sheets, email inbox), production env vars (Resend/Azure/S3/Redis), and anything needing a logged-in session.

## 7. Launch blockers & action plan

### Confirmed blockers (must fix before submission)

| # | Blocker | Effort |
|---|---|---|
| B1 | App Review access: demo account + seeded content, or approved demo mode | Code change (bypass seeded for a review account) or ops (real .edu mailbox for reviewer + coordination) |
| B2 | In-app privacy policy + terms links (Settings/About/onboarding) | Small |
| B3 | Email compose stub: hide the compose button or implement send | Small (hide) |
| B4 | In-app contact/support link | Small |
| B5 | Delete personal-team build from dev iPhone; confirm device installs | Ops |

### Unverified items that could become blockers

- Railway actually deployed `36c5ac5` (check dashboard / verify behavior)
- Production `MICROSOFT_*`, `RESEND_*`, `CHAT_MEDIA_S3_*`, `REDIS_URL` envs set correctly (verify via observable behavior: verification email sends, OAuth connects, images upload)
- iPad layout integrity if `supportsTablet` stays true
- Age-rating + privacy-label answers consistent with UGC chat

### Recommended v1.0 scope

**Include:** verification auth, profile/birthday, home, calendar (D/W/M + range + LMS iCal sync), communities/chat + images + report/block, campus events, account deletion, settings/themes, Emy helpers, admin moderation UI.
**Hide or finish:** email compose (hide button).
**Postpone:** push notifications, iPad support (set `supportsTablet:false` unless already tested), proactive profanity filter, Blackboard REST beyond iCal, Emy assistant depth.

### Implementation order

1. Ops: delete old app on iPhone → install LLC-signed build → smoke test (calendar range, chat image, birthday save, theme).
2. Small frontend changes: in-app legal/support links, hide compose (or implement), terms acceptance in onboarding, tidy permission strings, `ITSAppUsesNonExemptEncryption:false`, decide `supportsTablet`, strip dev-client for store build.
3. Demo-access mechanism for review + seeded demo content.
4. Verify production envs (send verification email, MS connect, image upload on prod).
5. `eas build -p ios --profile production` → TestFlight → device pass incl. iPad decision.
6. App Store Connect: metadata, screenshots, privacy labels, age rating (17+), demo account + detailed review notes (university-email login, LMS feeds optional, moderation present).
7. Submit. Confirm Railway stays up during review window.
