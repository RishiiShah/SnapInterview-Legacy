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

## Scripts

- `npm run dev`: Run dev server
- `npm run build`: Create production build
- `npm run start`: Start production server
- `npm run lint`: Run ESLint
- `npm test`: Run tests once
- `npm run test:watch`: Run tests in watch mode

## CI

GitHub Actions workflow lives in `.github/workflows/ci.yml` and runs on push/PR to `main`:

1. npm ci
2. prisma generate
3. lint
4. test
5. build

## Notes

- Do not commit `.env`.
- Use placeholder values only in CI for build-time checks.
- Production secrets must come from your deployment provider secret manager.
