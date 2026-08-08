# SnapInterview design reference

This reference covers the current landing, authentication, dashboard, question/coding, interview, and administration visual systems. The aim is credible, calm, dense-enough tooling for technical candidates rather than decorative marketing UI.

## Principles

- Prefer clarity, hierarchy, and useful product previews over visual spectacle.
- Use color to communicate hierarchy, state, and action; do not use it as filler.
- Show product behavior honestly. Avoid invented testimonials, customer marks, metrics, or feature claims.
- Treat keyboard focus, readable contrast, responsive layout, and reduced motion as defaults.
- Use motion to orient users, not to make routine controls feel animated.

## Foundations

`src/app/layout.tsx` provides Geist Sans, Geist Mono, and Newsreader. `src/app/globals.css` maps these to the shared sans, mono, and display tokens.

| Context | Canvas | Surface | Text | Accent |
| --- | --- | --- | --- | --- |
| Landing and auth | `#090A0F` | Near-black inset panels | `#F5F7FF`, slate supporting copy | Blue primary actions with restrained section accents |
| Dashboard and tooling | `#0B0C10` | `#12141A`, low-opacity white fills | `#F2F4F8`, muted slate | `#3B82F6`; semantic emerald, amber, and rose states |
| Code and contained previews | Deep black-blue inset | Fine `white/[0.06]` borders | Monospace where content is code-like | Use semantic pass/fail states |

Use light hairline borders instead of bright outlines or large glow shadows. Rounded panels typically use `rounded-xl` or `rounded-2xl`; density should follow the task, not a fixed card recipe. Avoid hover lift and tilt as a default interaction.

## Landing and authentication

The landing composition in `src/app/page.tsx` uses a hero, studio preview, product strengths, practice loop, final CTA, and footer. The public visual language is atmospheric but grounded: dark canvas, a floating navigation bar, editorial-scale hero text, working-product previews, and blue as the primary conversion action.

| Component | Responsibility |
| --- | --- |
| `HeroSection.tsx` and `HeroHeadline.tsx` | Landing entry point and staged headline/CTA treatment. |
| `HeroWorkspace.tsx` | Browser-framed studio preview. |
| `FeaturesSection.tsx` | Product-strength bento layout and live product cues. |
| `HowItWorksSection.tsx` | Preparation, interview, and review loop. |
| `CTASection.tsx` | Final conversion area and session preview. |
| `LandingNavbar.tsx` / `ScrollMorphingNavbar.tsx` | Responsive navigation and scroll-state chrome. |
| `LandingMotion.tsx` | Reusable reveal primitives that respect reduced motion. |

Authentication pages reuse the dark public palette and direct product language. Prefer the shared `AuthShell`, clear field labels, purposeful error states, and a visible route back to the landing page. The OTP component is an explicit registration step and should remain visually and behaviorally connected to that flow.

## Motion

Landing motion primitives live in `LandingMotion.tsx`. They use a soft ease and in-view reveals, with clip paths owned by the clipped child rather than the intersection-observed wrapper. Do not combine an initially fully clipped observer with `whileInView`; it can prevent the observer from firing.

Use `prefers-reduced-motion` support from global styles and the shared primitives. A reduced-motion experience should render the final state immediately, not merely slow animations down.

## Dashboard and question practice

The signed-in experience is quieter than the landing page. It uses display typography for page titles, compact controls, panel-based workspaces, and one dependable blue action color. `DashboardShell`, `Sidebar`, `Header`, and `SearchModal` provide shared chrome.

Q&A uses a filterable question bank and focused answer workspace. Coding is a separate conceptual surface: its detail page pairs the problem statement with a read-only JavaScript preview and ordered public sample cases. Candidate coding pages must not show execution, submission, verdict, solved, or history controls. Relevant components include `QuestionsPageClient`, `QuestionDetailPageClient`, `QuestionLeftPanel`, `QuestionRightPanel`, `CodingWorkspacePageClient`, and `CodingConceptPanel`.

## Interview room

The interview room optimizes for attention and confidence during a live interaction. `PreJoinScreen` and `PermissionRequest` explain browser media requirements before the session. `ActiveInterviewScreen` presents the current interviewer turn, candidate controls, and session context. `InterviewCodingPanel` is introduced only when the interview challenge requires it.

Audio, recording, and recognition states must be explicit in text and iconography. Do not rely on animation or color alone to convey microphone, camera, TTS, connection, or error state.

## Administration

Administration uses the same dark tooling foundations but prioritizes scanning, confirmation, and traceability. `AdminShell`, `AdminSidebar`, and `AdminHeader` supply chrome; overview, analytics, interview-detail, question-form, recording-integrity, and confirmation components should remain information-first. Destructive actions require a clear confirmation state.

## Implementation rules

- Use existing shared UI components before introducing a new button, modal, avatar, or shell.
- Keep `cursor-pointer` on clickable custom controls and preserve native semantics where possible.
- Put borders and backgrounds on the inner visual node of clip-revealed content so an empty shell does not flash before the reveal.
- Keep focus states visible against dark surfaces; do not replace them with hover-only affordances.
- Avoid bare `border` classes and animating to `currentColor` borders; specify the intended low-contrast border color.
- Keep visual changes scoped to their product surface. Landing/auth, dashboard, interview, share, and admin surfaces have related foundations but different density and hierarchy needs.
