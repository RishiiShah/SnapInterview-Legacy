# Q&A and Coding Concept Demo Specification and Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement the tasks sequentially. Steps use checkbox (`- [ ]`) syntax for tracking.

**Date:** 2026-08-05  
**Status:** Implementation verified locally; maintainer-owned Vercel deployment smoke pending  
**Deadline:** Finish as quickly as possible; five days is only the maximum deadline.  
**Goal:** Demonstrate a clean separation between Q&A practice and a conceptual Coding workspace inside the existing Next.js application.

**Architecture:** Keep the existing Next.js monolith and separate database-backed Q&A and Coding content. Candidate coding pages render a read-only concept preview and make no execution or submission requests; Q&A validation uses one shared four-value category vocabulary.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Prisma 7, PostgreSQL, Zod 4, Monaco Editor, Vitest, Testing Library.

## Global constraints

- Work in the current dirty checkout because relevant approved changes are not committed; preserve unrelated edits and do not alter Git state.
- Keep one combined specification and plan document; do not create another plan file.
- Keep the complete feature inside the existing Next.js monolith.
- Coding is a conceptual shell with no Run, Submit, grading, persistence, solved state, or history behavior.
- Do not add server execution, a separate backend, RAG, embeddings, remote-judge code, providers, stubs, or future scaffolding.
- Do not add, edit, or remove database migrations for this reduction.
- Do not delete shared runner files because the interview coding panel still imports them.
- Follow TDD for every behavior change and run focused tests before the full verification suite.

---

## 0. Demo contract

The professor demo is about product structure and interface design. Coding execution is not part of this MVP.

### The demo must show

- `/questions` as the working Q&A practice section.
- `/coding` as a separate conceptual coding catalog.
- `/coding/[slug]` as a polished problem-workspace shell with a prompt, editor preview, and sample testcase layout.
- `/admin/questions` as Q&A-only administration.
- `/admin/coding` as separate coding-problem administration.
- Coding content stored separately from `PracticeQuestion`.

### The demo must not claim or expose

- No Run button, Submit button, execution result, accepted verdict, or simulated grading.
- No submission persistence, solved-state workflow, submission history, rankings, or hidden-judge claims.
- No server-side execution, remote judge, sandbox, queue, worker service, or separate backend.
- No RAG, embeddings, vector database, semantic retrieval, or interview-bank integration.
- No provider interfaces, placeholder adapters, empty modules, throwing stubs, reserved configuration, or future-system scaffolding.

The conceptual Coding workspace must identify itself as a concept preview. It must not invite an action that cannot succeed.

---

## 1. Locked decisions

| Decision | Choice | Reason |
|---|---|---|
| Deployment | Existing Next.js monolith only | Fastest and already deployed architecture |
| Product boundary | Separate Q&A and Coding sections | The two experiences have different content and interfaces |
| Coding behavior | Conceptual shell only | Execution is not needed for the professor demo |
| Coding workspace | Prompt, read-only editor preview, and sample testcase preview | Shows the intended interaction without pretending it works |
| Coding admin | Keep list, create, edit, publish, and unpublish | Demonstrates separate content ownership |
| Q&A categories | Behavioral, technical, system design, and leadership only | Prevent coding records from re-entering Q&A |
| Database | Keep the currently applied coding tables and migrations unchanged | Avoid an unnecessary migration immediately before the demo |
| Existing inactive persistence tables | Do not extend, call, or demonstrate them | They are outside the concept demo and changing deployed history adds risk |

---

## 2. Application boundaries

```text
Existing Next.js application
  ├─ Q&A candidate section
  │    ├─ /questions
  │    └─ /questions/[slug]
  ├─ Coding concept section
  │    ├─ /coding
  │    └─ /coding/[slug]
  └─ Separate admin sections
       ├─ /admin/questions
       └─ /admin/coding
                │
                ▼
            PostgreSQL
```

- `/questions` reads `PracticeQuestion` only.
- `/coding` reads `CodingQuestion` and public `CodingTestCase` data only.
- `/admin/questions` accepts Q&A-only fields and categories.
- `/admin/coding` manages conceptual problem content separately.
- Candidate coding pages perform no code-execution or submission network requests.
- The existing Next.js application remains the only backend.

---

## 3. Q&A domain

`PracticeQuestion` remains Q&A-only and contains:

- `id`
- `slug`
- `text`
- `category`
- `difficulty`
- `estimatedTime`
- `tags`
- `hint`
- `sampleAnswer`
- timestamps and solved Q&A relation

Allowed Q&A categories are exactly:

- `behavioral`
- `technical`
- `system-design`
- `leadership`

The Q&A category schema, admin form, filters, constants, and TypeScript type must share this exact vocabulary. Neither `coding` nor `coding-algorithms` is valid for `PracticeQuestion`.

---

## 4. Coding concept domain

`CodingQuestion` and `CodingTestCase` remain the content source for the concept shell. Candidate DTOs expose only:

- problem identity, slug, and title
- description, constraints, difficulty, topics, time, and hint
- JavaScript preview source
- ordered public sample testcase input and expected output

Candidate pages never receive `solutionCode`.

Existing `CodingSubmission` and `CodingSolved` tables are not part of this demo contract. Do not add services, routes, components, or tests that make them active. Do not create another migration solely to remove already-deployed inactive tables before the demo.

---

## 5. Candidate experience

### Coding catalog

- `/coding` lists published coding concepts.
- Each card shows title, difficulty, topics, and estimated time.
- The page describes the area as a conceptual workspace, not executable practice.
- It does not display solved state.

### Coding detail

- `/coding/[slug]` shows the existing split problem-workspace layout.
- A visible `Concept preview` label sets expectations.
- The problem panel shows description, constraints, topics, and optional hint.
- The editor displays JavaScript preview code in read-only mode.
- The testcase area displays ordered public sample inputs and expected outputs.
- There is no Run, Submit, Reset, result tab, verdict, execution spinner, or success animation.
- Invalid or unpublished coding content stays out of the catalog and uses the existing problem-not-found state rather than partially rendering a broken workspace.

The workspace may look like the future product, but every visible interaction must be truthful today.

---

## 6. Admin experience

### Q&A admin

- `/admin/questions` contains no coding mode or coding fields.
- The category selector exposes only the four Q&A categories.
- Server validation rejects `coding`, `coding-algorithms`, and live interview-type values.

### Coding admin

- `/admin/coding` remains a separate content inventory.
- Administrators can create drafts and edit problem metadata, JavaScript preview source, and ordered public sample testcases.
- Publishing requires a title, description, JavaScript preview source, and at least one public sample testcase.
- Admin copy describes preview content without promising execution or grading.
- The demo admin does not expose Solution Code or Hidden testcase controls because both imply an execution or judging workflow.
- Existing `solutionCode` and `isHidden` database columns remain unchanged and inactive; no cleanup migration is added before the demo.

---

## 7. Cleanup boundaries

### Remove from the active demo surface

- The nonfunctional coding submission route and the test that expects HTTP 501.
- Unused candidate submission-history reads.
- Candidate Run, Submit, result, solved, and history UI claims.
- Coding entries from Q&A category constants and validation.
- Solution Code and Hidden testcase controls from the coding demo admin.

### Preserve

- Existing applied database migrations and coding content tables.
- Existing unrelated interview behavior.
- Existing user changes in the dirty working tree.
- Worker and runner files unless they can be removed without touching unrelated or user-modified work; they must not be imported by the concept shell.

No unrelated cleanup is authorized.

---

## 8. Testing and verification

- Q&A category tests prove the four allowed values succeed.
- Q&A category tests prove `coding`, `coding-algorithms`, and unrelated interview kinds fail.
- Coding concept component tests prove the concept label, editor preview, and sample cases render.
- Coding concept component tests prove Run, Submit, Reset, result, verdict, solved, and history controls are absent.
- Repository tests continue to prove hidden cases and `solutionCode` are excluded from candidate DTOs.
- Route inventory or source checks prove the disabled coding submission endpoint is absent.
- Run the full unit suite, lint, typecheck, Prisma validation, and production build.
- Perform a browser smoke test of `/questions`, `/coding`, `/coding/[slug]`, `/admin/questions`, and `/admin/coding` when an authenticated local session is available.

No execution, persistence, remote-server, RAG, or provider-swap tests are required.

---

## 9. Fastest implementation order

1. Lock the Q&A-only category vocabulary in validation, UI constants, and tests.
2. Replace the executable coding panel with the focused conceptual preview component.
3. Remove the disabled submit endpoint and unused visible workflow claims.
4. Run focused tests, then the full verification suite and production build.
5. Rehearse the exact professor navigation path and fix only demo blockers.

Do not pace these steps across five days. Move immediately to the next unblocked step and finish early.

---

## 10. Success criteria

- Q&A and Coding are visibly separate candidate and admin sections.
- Q&A contains no coding category or coding fields.
- Coding catalog, detail shell, and admin pages render from separate coding tables.
- The Coding workspace is clearly labeled as conceptual.
- No visible coding control implies execution, grading, persistence, or solved progress.
- No candidate coding submission endpoint is active.
- The app contains no new server-execution, RAG, remote-judge, provider, or placeholder scaffolding.
- Unit tests, lint, typecheck, Prisma validation, and production build pass.
- The implementation remains entirely inside the existing Next.js monolith.

---

## 11. Implementation tasks

### Task 1: Lock Q&A to four non-coding categories

**Files:**

- Create: `src/lib/admin/practice-question.test.ts`
- Create: `src/components/admin/AdminQuestionForm.test.tsx`
- Modify: `src/lib/interview/domain.ts`
- Modify: `src/lib/admin/practice-question.ts`
- Modify: `src/components/admin/AdminQuestionForm.tsx`
- Modify: `src/data/constants.ts`

**Interfaces:**

- Produces: `QUESTION_CATEGORY_VALUES = ["behavioral", "technical", "system-design", "leadership"] as const`.
- Produces: Q&A parsing and admin options that consume that exact shared tuple.
- Preserves: `INTERVIEW_TYPE_VALUES`, including `coding-algorithms`, for live interviews.

- [x] **Step 1:** Add a failing parser test proving each allowed Q&A category succeeds and `coding`, `coding-algorithms`, `recruiter-screen`, and `take-home` fail.
- [x] **Step 2:** Run `npm test -- src/lib/admin/practice-question.test.ts` and confirm the current parser fails because it consumes `INTERVIEW_TYPE_VALUES`.
- [x] **Step 3:** Add a failing admin-form test proving the rendered category options are exactly the four allowed Q&A values.
- [x] **Step 4:** Run `npm test -- src/components/admin/AdminQuestionForm.test.tsx` and confirm the current form exposes live interview types.
- [x] **Step 5:** Remove `coding` from `QUESTION_CATEGORY_VALUES` and `CATEGORIES`; change the parser and form to consume `QUESTION_CATEGORY_VALUES`.
- [x] **Step 6:** Re-run both focused tests and confirm they pass with pristine output.

### Task 2: Replace executable candidate coding practice with an honest concept shell

**Files:**

- Create: `src/components/coding/CodingConceptPanel.tsx`
- Create: `src/components/coding/CodingWorkspacePageClient.test.tsx`
- Create: `src/components/coding/CodingCatalogPageClient.test.tsx`
- Modify: `src/components/coding/CodingWorkspacePageClient.tsx`
- Modify: `src/components/coding/CodingCatalogPageClient.tsx`
- Modify: `src/lib/coding/contracts.ts`
- Modify: `src/lib/coding/contracts.test.ts`
- Modify: `src/repositories/coding-question-repo.ts`
- Modify: `src/repositories/coding-question-repo.test.ts`
- Modify: `src/app/(dashboard)/coding/page.tsx`
- Modify: `src/app/(dashboard)/coding/[slug]/page.tsx`
- Delete: `src/app/api/coding/questions/[slug]/submit/route.ts`
- Delete: `src/app/api/coding/questions/[slug]/submit/route.test.ts`

**Interfaces:**

- Produces: `CodingConceptPanel({ question })`, a read-only JavaScript editor preview plus public sample cases.
- Produces: `getPublishedCodingQuestions()` and `getPublishedCodingWorkspace(slug)` with no solved/user arguments or solved fields.
- Removes: the disabled candidate submission API and unused submission-history repository read.
- Preserves: `CodingRightPanel`, runner modules, and result components for unrelated interview usage.

- [x] **Step 1:** Add failing workspace tests for the `Concept preview` label, read-only Monaco option, visible sample input/output, and absence of Run, Submit, Reset, Test Result, verdict, solved, and history controls.
- [x] **Step 2:** Add a failing catalog test for conceptual copy and the absence of a solved badge.
- [x] **Step 3:** Run both focused component tests and confirm failure against the current executable UI.
- [x] **Step 4:** Implement `CodingConceptPanel`, wire it into `CodingWorkspacePageClient`, and update catalog/detail copy without importing runner code.
- [x] **Step 5:** Remove solved fields and user arguments from candidate coding contracts/repository reads and update their tests and page callers.
- [x] **Step 6:** Delete the disabled 501 submission route/test and the unused submission-history read.
- [x] **Step 7:** Re-run the focused coding component, contract, and repository tests and confirm they pass.

### Task 3: Make coding administration truthful to the concept demo

**Files:**

- Modify: `src/components/admin/AdminCodingFields.tsx`
- Modify: `src/components/admin/AdminCodingForm.tsx`
- Modify: `src/lib/admin/coding-question.ts`
- Modify: `src/lib/admin/coding-question.test.ts`
- Modify: `src/app/admin/(protected)/coding/actions.ts`
- Modify: `src/app/admin/(protected)/coding/[id]/edit/page.tsx`
- Modify: `src/app/admin/(protected)/coding/page.tsx`

**Interfaces:**

- Produces: coding admin form data containing preview metadata, JavaScript preview source, and public `{ input, expectedOutput }` sample cases only.
- Preserves: existing database columns and any stored `solutionCode`; update actions do not overwrite that inactive field.
- Persists: every edited testcase with `isHidden: false` while leaving the database schema unchanged.

- [x] **Step 1:** Extend the existing coding parser tests so public preview cases succeed while solution-code and hidden-case inputs are not exposed by the parsed demo form contract.
- [x] **Step 2:** Run `npm test -- src/lib/admin/coding-question.test.ts` and confirm failure against the current judge-oriented form shape.
- [x] **Step 3:** Remove Solution Code and Hidden controls/props from the admin fields and form; update copy to say JavaScript preview and public sample cases.
- [x] **Step 4:** Narrow parsing/actions/edit mapping so new and replaced testcases are explicitly public and updates preserve inactive stored solution code.
- [x] **Step 5:** Re-run the focused admin coding tests and confirm they pass.
- [x] **Step 6:** Run `npm test`, `npm run lint`, `npm run typecheck`, `npx prisma validate`, and `npm run build` from the repository root.

### Task 4: Harden Q&A and global-search read boundaries

**Goal:** Make the four-category Q&A boundary survive stale data and ensure global search cannot advertise invalid coding concepts.

- [x] Add failing repository/search tests for legacy invalid Q&A categories and malformed published coding concepts.
- [x] Validate or allowlist Q&A categories in candidate repositories, global search, admin facets/listing, and exports instead of casting arbitrary database strings.
- [x] Route coding search results by the explicit `type: "coding"` discriminator only.
- [x] Remove the obsolete seed script that writes coding records into `PracticeQuestion`.
- [x] Re-run focused repository, search-route, and SearchModal tests.

### Task 5: Align admin publishing with the candidate concept contract

**Goal:** An admin record marked Published must always satisfy the same limits used by the candidate catalog/workspace DTO.

- [x] Add failing tests proving overlong topics, estimates, or public samples cannot be published when the candidate contract would reject them.
- [x] Share or exactly align preview-source, topic, estimate, and public-sample limits between admin validation and candidate validation.
- [x] Replace remaining rendered validation language such as `starter code` and `testcase` with `JavaScript preview source` and `public sample case`.
- [x] Re-run focused admin, candidate-contract, and action tests.

### Task 6: Make the deployed demo truthful and reproducible

**Goal:** The repository is ready for the maintainer's existing Vercel workflow and its documentation describes the conceptual MVP that actually exists.

- [x] Correct stale product/design/README and public-interface claims about browser execution, submissions, solutions, and test-result feedback.
- [x] Ensure this singular implementation specification is not silently excluded from version control.
- [x] Run the full unit suite, lint, typecheck, Prisma validation, and production build.
- [ ] **Maintainer-owned:** Deploy through the existing Vercel workflow and smoke-test `/questions`, `/coding`, `/coding/[slug]`, `/admin/questions`, and `/admin/coding` with an authenticated session.
- [x] Do not enable `unsafe-eval`, add a coding server, or make live coding execution part of this conceptual MVP.

### Verification record

- 2026-08-05: 93 Vitest files / 441 tests passed; ESLint, TypeScript, Prisma validation, `git diff --check`, and the Next.js production build passed.
- The production route inventory contains `/coding` and `/coding/[slug]` and contains no candidate coding submission endpoint.
- The currently configured database was audited read-only and contains one valid published `two-sum` concept with JavaScript preview source and one public sample case.
- Vercel account, project, environment, domain, and deployment operations remain maintainer-owned and were not changed.
- The maintainer must confirm Vercel uses the intended migrated database and that `/coding/two-sum` resolves rather than assuming a successful build proves production data exists.
- After deployment, visually confirm that the Monaco preview renders on `/coding/two-sum` and that the browser console contains no CSP style violations before the professor demo.
