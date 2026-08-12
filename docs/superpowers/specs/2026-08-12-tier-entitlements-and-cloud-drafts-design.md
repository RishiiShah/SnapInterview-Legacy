# Tier Entitlements and Cloud Drafts Design

## Goal

Create a server-authoritative tier system that can be enabled before pricing or upgrade pages exist. Every user keeps access to the core practice product; tiers provide finite practice volume, deeper interview lengths, and durable cloud coding workspaces.

## Product Policy

The first policies are `FREE`, `PRO`, and `MAX`. No policy uses the word or behavior "unlimited". Each is a finite allowance that can be changed centrally without a database migration.

| Capability | Free | Pro | Max |
| --- | ---: | ---: | ---: |
| Interview starts | 3 per rolling 24 hours; 15 per rolling 7 days | 10 per rolling 24 hours; 50 per rolling 7 days | 25 per rolling 24 hours; 125 per rolling 7 days |
| Maximum interview depth | 5 questions | 10 questions | 15 questions |
| AI answer evaluations | 10 per rolling 24 hours; 50 per rolling 7 days | 40 per rolling 24 hours; 200 per rolling 7 days | 100 per rolling 24 hours; 500 per rolling 7 days |
| Coding catalog | Full access | Full access | Full access |
| Cloud coding drafts | No | Yes; 50 active drafts; expire 7 days after last edit | Yes; 200 active drafts; expire 30 days after last edit |

- All tiers keep the interview types, coding catalog, basic interview feedback, resume and job-description inputs, recordings, and share links that the product already provides.
- The existing supported interview values are exactly 5, 10, and 15 questions. The first release does not add a 20-question value.
- Future policies may add detailed feedback, history, recording retention, and analytics fields, but those fields are not enforced in the first rollout.
- New and existing users default to `FREE`. An internal-only mechanism may set a user to `PRO` or `MAX`; no public pricing, checkout, account page, upgrade prompt, or billing provider is included in this rollout.

## Entitlement Model

Add an entitlement record owned by the user with the current tier, its source, status, effective dates, and a provider reference reserved for a later billing integration. The current source is `MANUAL`; later sources can include `STRIPE` without rewriting callers.

A pure TypeScript policy module maps a tier to all product limits. Application code reads that module through one entitlement service; no route, component, or repository hard-codes a plan name or a numeric limit.

Add an append-only usage-event table. Each event records its owner, event kind, counted timestamp, and the interview or evaluation identifier when present. Rolling quota checks query events newer than the appropriate 24-hour or 7-day cutoff. This preserves an audit trail, supports an eventual credit/refund event, and avoids counters drifting under concurrent requests.

Existing infrastructure rate limits remain separate. Rate limiting protects the service from abuse; entitlement policy determines what a legitimate account may use.

## Interview and Evaluation Enforcement

- The interview-session create route resolves the authenticated user’s policy before storing a session.
- It rejects a requested question count larger than the policy’s `maxInterviewQuestions` with a stable `TIER_LIMIT_REACHED` response that includes the capability, relevant window when applicable, and `resetsAt`.
- It atomically creates a short-lived interview reservation after the tier and rolling-window checks pass. The first successful interviewer response finalizes the reservation as a usage event. Reservations that never reach a first response expire and do not consume the allowance.
- The answer-evaluation route performs the same policy lookup and atomically records a successful evaluation event.
- All tier checks run on the server. UI checks introduced later are advisory only and cannot bypass an API limit.

## Coding Workspace and Cloud Drafts

The current `/coding/[slug]` page is intentionally a read-only concept preview. To make a cloud save truthful, this work includes an editable coding workspace for the existing JavaScript question format; it does not add remote code execution or a submission judge to that page.

- The workspace starts with question starter code. A Free user’s edits are saved locally in that browser only.
- For Pro and Max users, the workspace also keeps one cloud draft for each user, question, and supported language.
- The client writes local storage immediately, then sends a debounced cloud save after 1–2 seconds without typing. It attempts a final save when the tab becomes hidden, the page navigates, or the component unmounts.
- A cloud draft contains code, language, a revision number, `updatedAt`, and `expiresAt`; it must remain below a defined safe source-size limit.
- A successful cloud update increments the revision. The update requires the caller’s latest known revision. If another tab has already saved, the route returns a conflict rather than silently overwriting newer code.
- On an eligible user’s page load, the newest non-expired cloud draft takes precedence over starter code. On a Free user’s load, only the browser-local draft is considered.
- An unused starter template is not stored as a cloud draft. Completed work remains a draft until the user explicitly deletes it or the retention job expires it.
- The server enforces ownership, the policy’s active-draft capacity, source-size limits, valid language, expiration, and revision checks. Source code is excluded from application logs and product analytics.
- On downgrade, drafts remain readable/savable only through their existing expiry window; they are never deleted immediately. After expiry the retention cleanup removes them.

## Data, Privacy, and Operations

- Add indexed access paths for quota events by user, kind, and timestamp, and for drafts by user, question, language, and expiration.
- Draft retention is enforced by a bounded, idempotent cleanup job. It must be safe to run repeatedly or concurrently.
- Tests cover authorization, invalid payloads, quota race conditions, reservation expiry/finalization, draft revision conflicts, expiry, capacity, restoration choice, and downgrade behavior.
- Add aggregate operational metrics: entitlement denials by capability/tier, cloud-save success and error counts, draft-restore rate, and cleanup counts. Do not record source code, resumes, answers, or other user content in telemetry.

## Deferred Work

- Public plan comparison, pricing, checkout, upgrades, and billing webhooks.
- The payment-provider implementation and provider-driven entitlement synchronization.
- Code execution, hidden test cases, submissions, and coding-score limits for the standalone coding workspace.
- Version history, collaboration, and cross-tab merge UI for coding drafts.
- Policy enforcement for richer feedback, analytics, recording retention, and history retention.

## Verification

Run focused Vitest suites for the policy service, entitlement/usage repositories, interview and evaluation routes, coding-draft routes, and editable workspace. Then run lint, typecheck, the full Vitest suite, production build, and existing Playwright smoke tests. Validate the Prisma schema and apply the migration only through the project’s normal deployment workflow.
