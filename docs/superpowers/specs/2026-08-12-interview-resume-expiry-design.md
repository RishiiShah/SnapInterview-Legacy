# Interview Resume Expiry Design

## Goal

An interview may be resumed only while it is `IN_PROGRESS` and less than 24 hours old, measured from its original `createdAt` timestamp. The window never extends after a reconnect, page reload, or answer.

## Policy

- At `createdAt + 24 hours`, an unfinished interview is no longer resumable.
- The first server operation that observes an expired in-progress session atomically changes its status to `COMPLETED` and reports that it has expired.
- A client must clear its local active-interview hint and present an expiry message rather than attempting to enter the interview room.
- Chat requests apply the same expiry check. A pre-join page that remains open across the boundary cannot continue an expired interview.
- Newly configured interviews held only in `sessionStorage` are not persisted sessions and do not begin their 24-hour window until the user joins and the server creates the session.

## Cleanup

Vercel Hobby permits only one cron invocation per day, so cleanup cannot guarantee a physical status update precisely at the 24-hour timestamp. The existing daily cleanup endpoint will also finalize expired `IN_PROGRESS` sessions in a bounded, indexed batch.

Request-time enforcement is authoritative: an expired session cannot be resumed or chatted with even if it has not yet been included in the daily batch. This preserves the exact user-facing 24-hour limit without adding a more frequent scheduler or production database job.

## Data and Concurrency

- Add an index on `InterviewSession(status, createdAt)` to support expiry selection without scanning completed history.
- Use conditional updates constrained by `id`, `userId`, `status = IN_PROGRESS`, and the 24-hour cutoff. This is idempotent and safe when a cron invocation and a user request race.
- The cleanup job selects a bounded batch of stale IDs and finalizes only those IDs still matching the stale in-progress condition.

## API and UI

- Session-state retrieval distinguishes an expired session from an unknown or unauthorized session.
- The pre-join controller blocks entry, clears `active_interview_id` when it refers to the expired interview, and displays a clear expiration message with a route back to practice.
- Existing completed sessions remain viewable through their normal recordings/analytics paths; this policy changes only resumability and stale status finalization.

## Verification

- Unit tests cover the exact cutoff, newer sessions, and concurrent/idempotent expiration.
- Route tests cover the expired response and the cleanup cron’s authorization, bounded batch, and response.
- Controller tests cover clearing the stale local hint and blocking join for an expired session.
- Run lint, typecheck, full Vitest, production build, and Playwright smoke tests. The database migration is validated by the existing CI PostgreSQL workflow before production deployment.
