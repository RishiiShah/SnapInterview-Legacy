# SnapInterview

AI-powered technical interview practice platform. Users conduct voice-based mock interviews with an AI interviewer, get recorded, receive detailed evaluations, and track improvement over time.

**Live at** [snapinterview.app](https://snapinterview.app)

---

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, Framer Motion
- **Auth**: Better Auth (session-based, HTTP-only cookies) + Google OAuth
- **Database**: PostgreSQL via Prisma ORM
- **AI**: Groq Cloud (Llama 3.3 70B) for interview chat and evaluation
- **Voice**: Web Speech API (recognition), ElevenLabs (TTS)
- **Storage**: AWS S3 for video recordings (presigned uploads)
- **Email**: Nodemailer via SMTP
- **Testing**: Vitest (unit), Playwright (E2E)
- **Hosting**: Vercel

## Prerequisites

- Node.js 22+ through 24.12.0 (newer Node 24 releases currently break Playwright in this project)
- npm 10+
- PostgreSQL database

## Local Setup

1. **Install dependencies**

   ```bash
   npm ci
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Fill in your values. Minimum to start the app:

   | Variable          | Description                      |
   | ----------------- | -------------------------------- |
   | `DATABASE_URL`    | PostgreSQL connection string      |
   | `AUTH_SECRET`     | Random secret for session signing |
   | `BETTER_AUTH_URL` | `http://localhost:3000` for local |

   See `.env.example` for the full list (Groq, ElevenLabs, S3, SMTP, etc.).

3. **Set up the database**

   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

4. **Start the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command              | Description                     |
| -------------------- | ------------------------------- |
| `npm run dev`        | Start dev server                 |
| `npm run build`      | Production build                 |
| `npm run start`      | Start production server          |
| `npm run lint`       | ESLint                           |
| `npm run typecheck`  | TypeScript check (no emit)       |
| `npm test`           | Run unit tests (Vitest)          |
| `npm run test:watch` | Tests in watch mode              |
| `npm run test:e2e`   | Playwright E2E tests             |

## Architecture

Layered backend — unusual for Next.js, intentional for separation of concerns:

```
API Routes → Services → Repositories → Prisma → PostgreSQL
```

- **API Routes** (`src/app/api/`) — thin controllers, input validation, auth checks
- **Services** (`src/services/`) — business logic (interview, evaluation)
- **Repositories** (`src/repositories/`) — data access layer (interview, user, question, notification)
- **Proxy** (`src/proxy.ts`) — Next.js 16 proxy for route gating, CSRF, CSP headers

Frontend state is composed from specialized hooks (no Redux/Zustand). The interview experience chains: `useInterviewPageController` → `useChatSession` + `useSpeechRecognition` + `useStreamingTTS` + `useVideoRecording`.

Full architecture doc: `docs/architecture.md`

### Project Structure

```
src/
├── app/                    # Pages + API routes
│   ├── (dashboard)/        # analytics, dashboard, practice, questions, recordings, settings
│   ├── api/                # 19 API route directories
│   └── interview/, login/, signup/, forgot-password/, onboarding/, share/
├── components/             # UI organized by feature area
├── data/                   # Constants, types, prompts/ (core + 28 role-specific JSONs)
├── hooks/                  # 10 React hooks
├── lib/                    # Core: ai/, auth, csrf, rate-limit, email, prisma, interview/, s3/
├── repositories/           # Data access layer
├── services/               # Business logic
├── utils/                  # Helpers, logger, retry
└── proxy.ts                # Route gating middleware
```

## Environment Variables

See `.env.example` for the canonical list. Key groups:

| Group    | Variables                                                            |
| -------- | -------------------------------------------------------------------- |
| Database | `DATABASE_URL`, `DIRECT_URL`                                         |
| Auth     | `AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`           |
| AI       | `GROQ_API_KEY`, `ELEVENLABS_API_KEY`                                 |
| Storage  | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` |
| Email    | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`     |
| CSRF     | `CSRF_TRUSTED_ORIGINS`, `CSRF_TRUSTED_ORIGIN_SUFFIXES`               |
| URLs     | `NEXT_PUBLIC_APP_URL`, `APP_URL`                                     |
| Cron     | `CRON_SECRET`                                                        |

Admin access uses `User.isAdmin` in the database. Sign in at `/login` (email or Google), then open `/admin`. Set `isAdmin = true` on the user row in your database (Prisma Studio, SQL, etc.).

### CSRF & Origins

All state-changing routes are protected by origin-based CSRF (`csrfRejectIfInvalid`). Valid origins come from `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `APP_URL`, and the `CSRF_TRUSTED_*` variables. `localhost:3000` is auto-allowed in dev.

## Security

- CSP with nonce-based `script-src`, HSTS, X-Frame-Options DENY
- Postgres-backed rate limiting (fails closed in prod, in-memory fallback in dev)
- Failed login lockout, security event audit log
- OTP registration with attempt counting + disposable email blocking
- Server/client import boundary enforcement via ESLint
- Cron endpoints require `Authorization: Bearer <CRON_SECRET>`

## CI

GitHub Actions (`.github/workflows/ci.yml`) on push/PR to `main`:

checkout → Node 24.12.0 → `npm ci` → `npm audit` → `prisma generate` → lint → typecheck → test → build → Playwright E2E

## Deployment (Vercel)

1. Connect repo to Vercel — auto-detects Next.js 16.
2. Set all env vars from `.env.example`. **Critical**: `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, and `APP_URL` must point to the production origin (e.g. `https://snapinterview.app`), not localhost.
3. S3 bucket should be private (no public ACLs) — all access via signed URLs.
4. Do **not** set `ENABLE_TEST_AUTH` in production.

### Cron Jobs (configured in `vercel.json`)

| Job                  | Schedule              | Purpose                                  |
| -------------------- | --------------------- | ---------------------------------------- |
| `/api/cron/cleanup`  | Daily 02:00 Server Time       | Hard-delete sessions soft-deleted 30+ days ago |
| `/api/cron/practice-reminder` | Daily 09:00 Server Time | Email inactive users                     |
| `/api/cron/weekly-report` | Mondays 08:00 Server Time | Weekly progress summary emails            |

## Secrets Management

- Never commit `.env`. `.gitignore` blocks `.env*` except `.env.example`.
- CI uses placeholder secrets. Production secrets go in Vercel environment settings.
- Rotate immediately if a secret is accidentally committed.

## AI Tooling

If you use AI coding assistants, keep the relevant context file updated:

- **Claude Code** → `CLAUDE.md`
- **Cursor / Copilot / Codex** → `AGENTS.md`

Both reference `docs/architecture.md` as the canonical source of truth — don't duplicate it.
