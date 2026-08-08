# SnapInterview

SnapInterview is a browser-based AI interview-practice application. Candidates can run tailored mock interviews, speak with an AI interviewer, record their session, review transcripts and evaluations, and work through focused behavioral or coding practice.

The production site is [snapinterview.app](https://snapinterview.app).

## Stack

- Next.js 16, React 19, TypeScript 6, and Tailwind CSS 4
- Better Auth with email/password and optional Google sign-in
- PostgreSQL through Prisma 7 and `@prisma/adapter-pg`
- Groq for streamed interview chat and evaluations
- Browser Speech Recognition plus Kokoro Web Worker TTS, with an optional ElevenLabs fallback
- Direct-to-S3 video uploads, SMTP email, Vercel Analytics, Vitest, and Playwright

## Requirements

- Node.js 24, matching CI
- npm and a PostgreSQL database
- Optional provider credentials for AI, Google sign-in, S3, SMTP, and ElevenLabs capabilities

## Local setup

1. Install dependencies.

   ```bash
   npm ci
   ```

2. Create a local environment file.

   ```bash
   cp .env.example .env
   ```

   At minimum, set `DATABASE_URL`, `AUTH_SECRET`, and `BETTER_AUTH_URL`.
   `AUTH_SECRET` and `CRON_SECRET` must be strong, non-placeholder values in production.

3. Generate the Prisma client and apply migrations.

   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

4. Start the app.

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local Next.js server. |
| `npm run build` | Build the production application. |
| `npm run start` | Run the production build. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run test:e2e` | Run the Playwright suite. |
| `npm run backfill:video-keys` | Backfill video keys for maintenance. |
| `npm run cleanup:evaluations:preview` | Preview invalid-evaluation cleanup. |
| `npm run cleanup:evaluations` | Remove invalid evaluations. |

## What the application includes

- Eight hiring-loop interview types, adjustable difficulty, persona, question count, resume and job-description context, and streamed AI follow-ups.
- Browser voice interaction: Web Speech API recognition and local Kokoro synthesis when enabled; server-side ElevenLabs synthesis is the fallback.
- Screen/video recording with direct multipart S3 uploads, session replay, transcripts, evaluations, sharing, and soft deletion.
- Behavioral, technical, system-design, leadership, and coding practice; coding pages use a browser editor and test results.
- Dashboard analytics, recordings, account settings, onboarding, notifications, search, and protected administrative workflows.

## Architecture

The server code follows a layered preference:

```text
Next.js route handler → service → repository → Prisma → PostgreSQL
```

Route handlers own HTTP concerns; services own interview and evaluation workflows; repositories isolate persistence. Client state for the interview room is composed from specialized React hooks rather than a global client-state store.

Detailed local references, when present, are available in `docs/architecture.md`, `docs/PRODUCT.md`, and `docs/DESIGN.md`. `docs/` is intentionally ignored in this repository, so those files are maintained with the workspace rather than published as tracked repository content.

## Environment

`.env.example` is the canonical environment-variable list. The major groups are:

| Area | Variables |
| --- | --- |
| Database | `DATABASE_URL`, `DIRECT_URL` |
| Auth and URLs | `AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `APP_URL`, Google client credentials |
| AI and voice | `GROQ_API_KEY`, `NEXT_PUBLIC_LOCAL_TTS_ENABLED`, ElevenLabs credentials and optional persona voice IDs |
| Storage | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| Security and jobs | `CSRF_TRUSTED_ORIGINS`, `CSRF_TRUSTED_ORIGIN_SUFFIXES`, `CRON_SECRET`, `ENABLE_TEST_AUTH` |

Only enable `ENABLE_TEST_AUTH=1` for test environments. Do not set it in production.

## Security

- Protected routes are gated by the Next.js proxy and server-side session checks.
- State-changing routes use origin-based CSRF protection.
- The proxy applies a nonce-based CSP, HSTS, frame protection, referrer policy, and a camera/microphone permissions policy.
- Login attempts are rate-limited, failed attempts can lock an account, and security events are recorded.
- Cron routes expect `Authorization: Bearer <CRON_SECRET>`.

## Testing and CI

Tests live next to their source when practical; Playwright covers browser flows. The GitHub Actions workflow for `main` runs dependency installation, `npm audit`, Prisma generation, linting, type-checking, Vitest, a production build, Chromium installation, and Playwright smoke tests on Node 24.

## Deployment

Deploy the Next.js app to Vercel and configure the variables from `.env.example`. Production origin variables must use the deployed HTTPS origin. Keep the S3 bucket private; browser uploads use short-lived signed requests.

`vercel.json` schedules these protected cron endpoints:

| Endpoint | Schedule (UTC) | Purpose |
| --- | --- | --- |
| `/api/cron/cleanup` | Daily at 02:00 | Permanently remove expired soft-deleted sessions. |
| `/api/cron/practice-reminder` | Daily at 09:00 | Send practice reminders. |
| `/api/cron/weekly-report` | Monday at 08:00 | Send weekly progress reports. |
