# Interview Resume Expiry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce a 24-hour server-authoritative resume window from `InterviewSession.createdAt`, complete stale sessions, and prevent expired interviews from joining or chatting.

**Architecture:** Repository functions make expiry updates conditional and indexed. The service owns policy; routes return HTTP 410; the daily Hobby cron handles dormant rows; pre-join clears a matching local hint and disables Join.

**Tech Stack:** Next.js, React, TypeScript, Prisma/PostgreSQL, Vitest, Playwright, Vercel Cron.

## Global Constraints

- Eligible means `IN_PROGRESS` and `createdAt > now - 24 hours`; activity never extends the window.
- Request-time expiry is authoritative; Hobby's once-daily cron only makes untouched-row cleanup eventual.
- Use conditional updates for cron/request concurrency and keep `changes.md` untracked.
- Make all changes on `develop`, never `main`.

---

### Task 1: Indexed, atomic expiration persistence

**Files:**
- Modify: `prisma/schema.prisma`, `src/repositories/interview-repo.ts`, `src/repositories/interview-repo.test.ts`
- Create: `prisma/migrations/20260812120000_add_interview_resume_expiry_index/migration.sql`

**Produces:** `expireInterviewSessionIfStale({ interviewId, userId, cutoff }): Promise<boolean>` and `completeExpiredInterviewSessions({ cutoff, limit }): Promise<number>`.

- [ ] Write failing tests asserting `updateMany` has `{ id, userId, status: "IN_PROGRESS", createdAt: { lte: cutoff } }` and changes status to `COMPLETED`; assert cleanup selects at most `limit` stale IDs then rechecks stale conditions in its update.
- [ ] Run `npm test -- src/repositories/interview-repo.test.ts`; expect missing-function failure.
- [ ] Add `@@index([status, createdAt], map: "InterviewSession_resume_expiry_idx")`; add the matching `CREATE INDEX` migration; implement the two repository functions with conditional `updateMany`, ascending `createdAt` selection, and `0` for no selected IDs.
- [ ] Run `npm test -- src/repositories/interview-repo.test.ts && npx prisma validate`; expect pass.
- [ ] Commit with `git add prisma/schema.prisma prisma/migrations/20260812120000_add_interview_resume_expiry_index src/repositories/interview-repo.ts src/repositories/interview-repo.test.ts && git commit -m "feat(interview): expire stale resumable sessions"`.

### Task 2: Central service and HTTP enforcement

**Files:**
- Modify/Test: `src/services/interview-service.ts`, `src/services/interview-service.test.ts`
- Modify/Test: `src/app/api/interview/session/route.ts`, `src/app/api/interview/session/route.test.ts`
- Modify/Test: `src/app/api/interview/chat/route.ts`, `src/app/api/interview/chat/route.test.ts`

**Produces:** `INTERVIEW_RESUME_WINDOW_MS`, `getResumableInterviewSessionState({ userId, interviewId, now? })`, and an `expired` result from both session state and chat.

- [ ] Write failing tests for expiry exactly at `new Date(now.getTime() - 24 * 60 * 60 * 1000)`, a newer session succeeding, and expired chat doing no transcript/model work. Route tests must assert `{ error: "This interview expired after 24 hours." }` and status `410` for both metadata and chat.
- [ ] Run `npm test -- src/services/interview-service.test.ts src/app/api/interview/session/route.test.ts src/app/api/interview/chat/route.test.ts`; expect `expired` result/type failures.
- [ ] Implement the cutoff in the service only. Call conditional expiry before reading state; return `expired` if it changed a row; require `status === "IN_PROGRESS"` before chat work. Map `expired` to `apiError("This interview expired after 24 hours.", 410)` in both routes.
- [ ] Run the same focused command; expect pass.
- [ ] Commit with `feat(interview): enforce 24-hour resume window`.

### Task 3: Daily Hobby-safe cleanup

**Files:**
- Modify/Test: `src/app/api/cron/cleanup/route.ts`, `src/app/api/cron/cleanup/route.test.ts`

**Consumes:** `completeExpiredInterviewSessions({ cutoff, limit: 500 })` and `INTERVIEW_RESUME_WINDOW_MS`.

- [ ] Write a failing authorized-cron test expecting response `{ deleted: 23, completedInterviews: 17 }` and a call with `limit: 500`.
- [ ] Run `npm test -- src/app/api/cron/cleanup/route.test.ts`; expect response mismatch.
- [ ] Run rate-limit cleanup and stale-session cleanup with `Promise.all`; calculate the cutoff from the shared constant; log and return both counts. Keep `vercel.json` daily schedule unchanged.
- [ ] Run the cron test; expect pass.
- [ ] Commit with `feat(cron): complete expired interviews daily`.

### Task 4: Block expired pre-join attempts

**Files:**
- Modify/Test: `src/hooks/useInterviewPageController.ts`, `src/hooks/useInterviewPageController.test.tsx`
- Modify: `src/app/interview/[uuid]/InterviewPageClient.tsx`, `src/components/interview/PreJoinScreen.tsx`
- Create/Test: `src/components/interview/PreJoinScreen.test.tsx`

**Produces:** controller `resumeExpired: boolean` and `PreJoinScreen` prop `resumeExpired: boolean`.

- [ ] Write failing controller test: a metadata `Response` with status `410` sets `resumeExpired`, clears `active_interview_id` only when it equals the current ID, and does not log a connection failure. Write failing UI test: `resumeExpired` disables Join and displays `This interview expired after 24 hours. Start a new interview to continue.`
- [ ] Run `npm test -- src/hooks/useInterviewPageController.test.tsx src/components/interview/PreJoinScreen.test.tsx`; expect missing state/prop failures.
- [ ] Implement only HTTP-410 handling in the controller. Pass the boolean through the route client. Set `canJoin = hasPermission && !resumeExpired`; retain Back so the user can create a new interview.
- [ ] Run the same focused command; expect pass.
- [ ] Commit with `fix(interview): block expired resume attempts`.

### Task 5: Release verification and documentation

**Files:**
- Modify: `README.md` cleanup cron description.

- [ ] Update the cleanup table row to say it removes expired rate-limit buckets and completes a bounded batch of interviews older than 24 hours.
- [ ] Run `npm run lint && npm run typecheck && npm test && ./node_modules/.bin/next build --webpack && npm run test:e2e && npm audit --audit-level=high`.
- [ ] Confirm the existing database CI job runs `npx prisma migrate deploy`; do not apply a migration to production from this branch.
- [ ] Commit documentation with `docs: describe interview expiry cleanup`.
