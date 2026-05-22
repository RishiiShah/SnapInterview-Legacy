# SnapInterview

AI-powered mock interview platform built with Next.js, Better Auth, Prisma, and Vitest.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Prisma + PostgreSQL
- Better Auth
- Vitest + ESLint

## Prerequisites

- Node.js 22+
- npm 10+
- PostgreSQL database

## Local Setup

1. Install dependencies:

```bash
npm ci
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Generate Prisma client:

```bash
npx prisma generate
```

4. Apply migrations:

```bash
npx prisma migrate deploy
```

5. Start development server:

```bash
npm run dev
```

Open http://localhost:3000.

## Environment Variables

See `.env.example` for the full list. The minimum required for core app startup:

- DATABASE_URL
- AUTH_SECRET
- BETTER_AUTH_URL

### CSRF & Origins

All state-changing API routes are protected by an origin-based CSRF check via `csrfRejectIfInvalid`. Valid origins are derived from:

- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `APP_URL`
- `CSRF_TRUSTED_ORIGINS` (comma-separated full origins)
- `CSRF_TRUSTED_ORIGIN_SUFFIXES` (comma-separated domain suffixes, e.g. `.example.com`)

In development, `http://localhost:3000` and `http://127.0.0.1:3000` are always allowed. Make sure your reverse proxy preserves the `Origin` header for POST/PUT/PATCH/DELETE requests so CSRF checks can work correctly.

## Scripts

- `npm run dev`: Run dev server
- `npm run build`: Create production build
- `npm run start`: Start production server
- `npm run lint`: Run ESLint
- `npm test`: Run tests once
- `npm run test:watch`: Run tests in watch mode

## AI Tooling

If you use AI coding tools, keep the relevant context file up to date so the agent understands the project:

- **Claude Code** — create `CLAUDE.md` at the repo root
- **Cursor / Copilot / Codex / other** — create `AGENTS.md` at the repo root

All contributors (regardless of tool) should have `docs/architecture.md` locally. It is the single source of truth for project architecture and is referenced by all AI context files. Do not duplicate its contents into `CLAUDE.md` or `AGENTS.md` — just reference it.

## CI

GitHub Actions workflow lives in `.github/workflows/ci.yml` and runs on push/PR to `main`:

1. npm ci
2. prisma generate
3. lint
4. test
5. build

## Security & Privacy

- **Authentication & sessions**: Managed by Better Auth with HTTP-only cookies and session records in PostgreSQL.
- **Interview content & AI**: Interview transcripts and practice answers are sent to an external AI provider (Groq) for scoring and feedback. Do not use this app for data that must never leave your infrastructure.
- **Recordings & storage**: Video recordings are stored in a private S3 bucket. API routes scope keys by user ID so users can only list/delete their own recordings.
- **Security events**: Login attempts, password changes, password resets, session revocations, and (for password-based accounts) account deletions are logged in the `SecurityEvent` table for auditing.
- **CSRF protection**: All state-changing API routes enforce an origin check via `csrfRejectIfInvalid` using the origin whitelist and suffixes described above.

### Secrets Management

- Do **not** commit `.env` or any real credentials. `.gitignore` is configured to ignore `.env*` except `.env.example`.
- Use `.env.example` as the canonical list of required environment variables and keep only non-sensitive placeholder values there.
- In CI, use placeholder secrets sufficient for build/tests only; in production, inject real secrets via your deployment provider’s secret manager (e.g., Vercel/Render/Heroku environment settings).
- If a secret is ever accidentally committed, rotate it immediately in the provider and scrub it from git history before pushing new changes.

## Deployment

- **Database**: Provision a managed PostgreSQL instance and set `DATABASE_URL` accordingly.
- **Runtime**: Deploy the Next.js app to a platform that supports Next 16 (e.g., Vercel, Render, Fly.io) and configure environment variables from `.env.example`.
- **S3 storage**: Create a private S3 bucket for recordings; configure `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `S3_BUCKET_NAME`. Bucket should disallow public ACLs; all access happens via signed URLs.
- **Email**: Configure `SMTP_*` variables (or provider-specific SMTP settings) for OTP and reset emails. For production, prefer a dedicated email provider over a personal Gmail account.
- **AI provider**: Set `GROQ_API_KEY` and ensure your privacy policy matches Groq’s data-handling terms.
- **CSRF origins**: For production domains, set `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, and `APP_URL` to the same public origin (e.g. `https://snapinterview.app`) in your host’s environment settings (Vercel → Settings → Environment Variables). Middleware validates sessions via `fetch(BETTER_AUTH_URL/api/auth/get-session)` — if this points at localhost, production auth breaks. Optionally set `CSRF_TRUSTED_ORIGINS` / `CSRF_TRUSTED_ORIGIN_SUFFIXES`. Do **not** set `ENABLE_TEST_AUTH` in production.

## API Overview (high level)

- **Auth & account**
  - `POST /api/register`: Start email+password signup, sends OTP; body: `{ name, email, password }`.
  - `POST /api/verify-otp`: Verify registration OTP and create account.
  - `POST /api/forgot-password`: Request password reset code.
  - `POST /api/reset-password`: Complete reset with code and new password.
  - `POST /api/change-password`: Change password for logged-in users (requires current password).
  - `DELETE /api/delete-account`: Delete logged-in user (requires password and `confirm: "DELETE"`).

- **Settings**
  - `PATCH /api/settings/profile`: Update basic profile metadata.
  - `PATCH /api/settings/notifications`: Update notification preferences.
  - `PATCH /api/settings/security`: Revoke other sessions or current session.

- **Interviews**
  - `POST /api/interview/session`: Create a new interview session.
  - `GET /api/interview/:id`: Fetch a single interview session (authorized user only).
  - `POST /api/interview/chat`: Send transcript blocks and receive streamed AI interviewer responses.
  - `POST /api/interview/evaluate`: Run AI evaluation on an interview transcript.

- **Practice questions**
  - `POST /api/questions/evaluate`: Evaluate an answer to a practice question.
  - `POST /api/questions/solve`: Mark a practice question as solved.

- **Recordings (S3)**
  - `POST /api/s3/upload`: Get a presigned URL + key for uploading a recording for a specific interview.
  - `GET /api/s3/videos`: List signed URLs for the current user’s recordings.
  - `DELETE /api/s3/videos`: Delete a recording by `key` (must be within the current user’s prefix).
