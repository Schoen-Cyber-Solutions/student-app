# Study with Emy — Onboarding Redesign Proposal (V1.0)

**Status:** proposal for approval — no code changed.
**Date:** 2026-10-19 · audited against `student-app-development` @ `ac72f18` + uncommitted ToS/email-flag work, `student-backend` @ `36c5ac5` + uncommitted ToS-acceptance work.

---

## 1. Current flow map

```
Launch ──► app/_layout (initialRouteName = 'onboarding')
           │
           ▼
   app/onboarding.tsx  ── session check → routes forward by onboardingState ──┐
   ├─ Step "email": university email input + ToS/Privacy checkbox + links    │
   │    └─ POST /api/auth/email/request-code  (checkbox required)            │
   └─ Step "code": 6-digit code, resend cooldown, "use different email"      │
        └─ POST /api/auth/email/verify-code  → session token                │
              │  backend creates User (onboardingState='needs_profile')      │
              ▼                                                             │
   app/setup.tsx  "Create your profile"                                     │
   ├─ University card (derived from verified email domain)                  │
   ├─ Username*  (required, regex + 409-taken handling)                     │
   ├─ First name (opt) · Birthday MM/DD (opt) · Program/Major free text     │
   │   (opt) · Academic year chips (opt)                                    │
   └─ POST /me/profile/setup → state='needs_academic_setup'                 │
              ▼                                                             │
   app/academic-setup.tsx  "Academic setup"                                 │
   ├─ University card · Program picker (official list + search)             │
   ├─ Level chips (undergrad/grad/other) · Term chips (required)            │
   └─ PATCH academic profile → state='needs_courses'                        │
              ▼                                                             │
   app/courses-setup.tsx  "Add your courses"                                │
   ├─ Search official schedule, add/remove sections (0 allowed)             │
   └─ POST completeCourseSetup → state='needs_lms_setup'                    │
              ▼                                                             │
   app/calendar-connect.tsx  "Connect Blackboard or Canvas"                 │
   ├─ Provider pick + iCal URL paste (optional)                             │
   ├─ Connect → POST /calendar/connect → 'complete'                         │
   └─ "Skip for now" → POST /calendar/skip → 'complete'                     │
              │  router.dismissAll() → /(tabs)                              │
              ▼                                                             │
   (tabs)/_layout ── first launch → router.push('/emy-welcome')             │
   app/emy-welcome.tsx ── 7 slides (Home / Calendar / Courses / Events /    │
   Communities / outro), Skip + Back/Next, SecureStore flag                 │
              │                                                             │
              ▼                                                             │
                              HOME                                          │
   Relaunch: initialRouteName='onboarding' → checkSession → state route ────┘
```

**Backend state machine** (server-authoritative):
`needs_profile`/`needs_username` → `needs_academic_setup` → `needs_courses` → `needs_lms_setup`/`needs_calendar` → `complete`
(`me.ts:205`, `academic.ts:335,458`, `me.ts:639,738`)

## 2. Problems identified

| # | Problem | Severity | Evidence |
|---|---|---|---|
| P1 | **No brand/welcome moment.** First screen is a bare email form — no Emy, no product framing. The mascot only appears *after* the full flow. | Recommended | `onboarding.tsx:189` |
| P2 | **Duplicated academic fields.** `setup.tsx` collects "Program / Major" (free text → `User.program`) AND "Academic year" chips; `academic-setup.tsx` then re-asks program (official picker) and level. Two sources of truth, twice the typing. | Required | `setup.tsx:194-222` vs `academic-setup.tsx:127-176` |
| P3 | **No progress indicator.** Users can't tell how many steps remain across 4 sequential screens. | Recommended | all onboarding screens |
| P4 | **BackButton during onboarding can loop.** Back from `setup` → `onboarding` → `checkSession` → `routeForUser` pushes right back to `setup`. Effectively a no-op / confusion. | Recommended | `setup.tsx:136`, `onboarding.tsx:85-93` |
| P5 | **Emy intro is 7 slides post-onboarding.** Content is good but long; slides 2-6 describe features discoverable via EmyHelp buttons anyway. | Optional | `emy-welcome.tsx:18-47` |
| P6 | **Inconsistent card widths** — 360 / 400 / 460 across steps; minor visual drift. | Optional | `onboarding.tsx:304`, `academic-setup.tsx:240`, `courses-setup.tsx:341` |
| P7 | **Accessibility gaps.** TextInputs rely on placeholder only (no `accessibilityLabel`); year/level/term/program chips have no `accessibilityRole`/`accessibilityState.selected`. | Required | `setup.tsx:145-221`, `academic-setup.tsx:140-201` |
| P8 | **Inconsistent heading copy.** "Create your profile" / "Academic setup" / "Add your courses" / "Connect Blackboard or Canvas" — no shared "Step X · title" rhythm or shared sub-line explaining why. | Recommended | titles across screens |
| P9 | **Cold-start flash.** Every launch enters `onboarding` briefly (spinner) before routing — acceptable but could hold the splash screen until the route decision. | Optional | `app/_layout.tsx:17`, `onboarding.tsx:174-180` |
| P10 | **Terms accept is client-gated only at request-code.** Backend gate exists at verify-code (new work), but the checkbox lives only on the email step — fine, keep as is. | — (resolved) | `onboarding.tsx`, `emailVerification.ts` |

**What is already good (keep):** server-driven `onboardingState` resume (robust interrupted-flow handling), code resend cooldown + "use different email", anti-enumeration responses, optional birthday (already optional — do NOT make required), calendar-connect skip, keyboard-aware scroll, error copy per failure class, Light/Dark theming throughout.

## 3. Proposed flow

Constraints honored: backend state machine order is fixed (can't reorder steps without backend work), verification is mandatory, ToS gate is now server-enforced.

```
S0  Welcome            NEW — Emy + name + one-line value prop + "Get Started"
S1  University email   existing + Emy header mark + step dots
S2  Verify code        existing + step dots
S3  Your profile       Username* + First name + Birthday (opt)  [fields trimmed]
S4  Academic setup     Program + Level + Term  [becomes the only program ask]
S5  Courses            "Pick your classes — you can change this anytime"
S6  Calendar (optional) existing, unchanged
S7  Meet Emy           compressed welcome (3 slides) → Home
```

### Screen-by-screen spec

**S0 · Welcome (NEW, Recommended)**
- Layout: centered column, safe-area padded. Emy icon ~120pt (reuse `assets/images/emy-icon.png`).
- Title: "Study with Emy" (`typography.heading` 30). Sub: "Your schedule, courses, and campus — in one place."
- Primary button "Get Started" → `/onboarding`. No skip needed (single screen).
- Light: white bg, navy text, cyan button. Dark: navy bg, white text, cyan button, navy button text — matches existing `tint`/`tintText` tokens.

**S1 · University email** — add small Emy glyph (48pt) top-left or centered above title; title "Verify your university email"; keep supported-universities hint, input, ToS checkbox + links, "Send verification code" → "Continue". Step dots 1 of 5.

**S2 · Verify code** — unchanged behavior; add step dots 2 of 5; keep resend/change-email. Error copy unchanged (intentionally non-specific for enumeration resistance).

**S3 · Your profile** — REMOVE "Program / Major" free text and "Academic year" chips (P2). Keep Username* / First name / Birthday MM-DD (optional, helper text "Optional — used for your profile"). University card stays as context. Button "Continue". Step dots 3 of 5.

**S4 · Academic setup** — unchanged fields (this is now the single place program is asked); title "Your program & term"; subtitle "Picked from {University}'s official catalog". Step dots 4 of 5.

**S5 · Courses** — subtitle change: "Search the official schedule and add your sections — you can add or remove these anytime in Settings." Footer button label "Continue" (already dynamic). Step dots 5 of 5. (Dotted list shows "course" step even though optional-with-zero — communicate that it's skippable-free, i.e. Continue works at 0.)

**S6 · Calendar connect** — unchanged; marked clearly "Optional" (already in subtitle). No step dot (it's a bonus step) or "Step 5 · Bonus".

**S7 · Meet Emy** — compress 7 slides → 3: (1) "Hi, I'm Emy" welcome + what the app is; (2) "Home & Calendar" + "Courses & Communities" combined; (3) "Tap me on any screen for a tip" + Get Started. Or keep 7 — Optional priority either way.

### Progress indicator
`components/OnboardingProgress.tsx` (new, ~30 lines): row of dots, `steps` + `current` props; tinted current, `accessibilityElementsHidden` + parent `accessibilityLabel="Step {n} of 5"`. Used on S1–S5.

### Back navigation rule
During onboarding, remove `BackButton` from `setup.tsx` (would loop, P4); keep it on `academic-setup`/`courses-setup` (going back to edit profile/courses mid-flow is legitimate). OR replace in-flow back behavior with a single-state-machine "previous step" that calls the previous screen's route — simplest reliable option: keep BackButton only where `router.canGoBack()` lands on a sibling setup screen, never on `onboarding`.

## 4. Required frontend/backend changes

**Frontend (new files):**
- `components/OnboardingProgress.tsx` — dot indicator.

**Frontend (edits):**
- `app/onboarding.tsx` — Emy header on both steps + progress dots; no functional change to verify logic.
- `app/setup.tsx` — remove program/year inputs; trim `payload`; drop BackButton during onboarding (keep when reached from profile edit? — it's only reachable in onboarding anyway: `setup` route is onboarding-only, profile edits use `profile-edit`) → drop BackButton entirely; adjust error mapping (program/year no longer sent).
- `app/academic-setup.tsx` — title/subtitle copy + progress dots.
- `app/courses-setup.tsx` — subtitle copy + progress dots.
- `app/emy-welcome.tsx` — optional slide compression.
- NEW `app/welcome.tsx` — S0; add `Stack.Screen` entry; point `initialRouteName` at it (verify Expo Router settings shape).

**Backend:** none required for the proposal itself. ToS persistence work already lands the gate. (Optional: consolidate `needs_lms_setup`/`needs_calendar` into one state — cosmetic, skip.)

**Data note:** `User.program`/`User.academicYear` remain editable later in `profile-edit.tsx` — removing them from onboarding doesn't lose the fields; it removes the duplicate ask. Students who skip can still fill them in Settings.

## 5. Accessibility considerations

- Add `accessibilityLabel` to every TextInput (labels exist visually but aren't wired).
- Chips/program rows: `accessibilityRole="button"` + `accessibilityState={{ selected }}`.
- Progress dots: hidden from AT, parent announces "Step N of 5".
- Keep 48pt input heights; chips should meet 44pt targets (current `paddingVertical: sm` ≈ fine, verify).
- ToS checkbox already uses `accessibilityRole="checkbox"` + checked state.
- Error text: consider `accessibilityLiveRegion="polite"` so VoiceOver announces errors.
- Contrast: `mutedText` placeholders on `surface` inputs — verify ≥ 4.5:1 in both themes; if marginal, darken placeholder or rely on visible labels (we have them).
- No auto-advance, no time limits, no gesture-only interactions — compliant posture.

## 6. App Store readiness assessment

- **Registration reliability:** server state machine + re-routing makes interrupted onboarding resumable — meets 2.1's stability bar. P9 (splash flash) is cosmetic.
- **Legal flow:** ToS checkbox + links before code request + server-stamped acceptance — solid, distinguishable from data consent (no optional-data consent exists, so no conflation issue).
- **Data minimization:** birthday already optional; trimming program/year duplication *reduces* collected-at-signup data — good under 5.1.1(iii).
- **Error recovery:** per-failure-class copy exists on every step; verify-code deliberately vague (security trade-off, keep).
- **Demo-account compatibility:** flow still requires a real .edu mailbox — the separate demo-account work item is unchanged by this redesign (the redesign makes the *visible* flow shorter, which helps reviewers once they're in).
- No bypasses introduced anywhere.

## 7. Testing strategy

| Layer | What |
|---|---|
| Unit (existing) | `birthday.test.ts`, `tosAcceptance.test.ts`, `featureFlags.test.ts` — unchanged |
| Unit (new) | `OnboardingProgress` render logic (current index → dot states); setup payload builder if extracted |
| Manual (device) | Full flow end-to-end on the iPhone; kill-app mid-step at each screen → relaunch lands on the right step; airplane-mode failure at each save; rotate through Light/Dark on every screen |
| Regression | Login of an existing complete account; re-onboard with a second university email; "Use a different email" path; resend cooldown |

## 8. Implementation plan (priority order)

| Order | Change | Class |
|---|---|---|
| 1 | Remove duplicated program/year fields from `setup.tsx` | **Required** — cuts a real redundancy + reduces data asked at signup |
| 2 | Add `accessibilityLabel`/`accessibilityState` to inputs & chips across the four setup screens | **Required** — a11y gaps are review-visible |
| 3 | New `welcome.tsx` (S0) + route registration | **Recommended** — cheap, fixes the cold open |
| 4 | `OnboardingProgress` dots on S1–S5 | **Recommended** |
| 5 | Remove/guard BackButton on `setup.tsx` (loop risk) | **Recommended** |
| 6 | Copy pass: titles/subtitles per spec incl. "change anytime" on courses | **Recommended** |
| 7 | Unify card max-width (400) across screens | Optional |
| 8 | Compress emy-welcome 7 → 3 slides | Optional |
| 9 | Hold splash until initial route decision (kill S0/onboarding flash) | Optional |
| 10 | Backend: consolidate `needs_lms_setup`/`needs_calendar` | Optional (later) |

Estimated scope: ~6 files edited + 2 new for Required+Recommended; ~2h-equivalent work. Zero backend changes needed for Required items.
