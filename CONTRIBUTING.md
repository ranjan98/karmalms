# Contributing to KarmaLMS

Thanks for helping build an LMS companies actually want to use. 🎓

## Getting started

```bash
git clone https://github.com/ranjan98/karmalms.git
cd karmalms
cp .env.example .env
docker compose up        # app + Postgres + MinIO
```

Or run the app directly while Docker provides the services:

```bash
npm install
npm run db:push
npm run dev
```

## Before you open a PR

```bash
npm run typecheck
npm run lint
npm test                 # unit tests — pure logic, no database

# DB-layer integration tests, run against a throwaway Postgres:
createdb karmalms_test
DATABASE_URL=postgres://localhost:5432/karmalms_test npm run test:integration
```

CI runs all four on every push. The integration suite (`*.itest.ts`)
exercises the data layer against a real Postgres; the unit suite
(`*.test.ts`) stays database-free.

## Project layout

| Path | What lives here |
|---|---|
| `src/app` | Next.js routes (App Router) |
| `src/db` | Drizzle schema + client |
| `src/lib/auth` | Auth adapter interface + adapters |
| `src/lib/storage` | Storage provider interface + adapters |
| `src/lib/llm` | LLM provider interface + adapters |
| `src/lib/directory` | HRIS directory-sync interface + adapters |
| `src/lib/config` | Environment-driven config |
| `src/test` | Integration-test setup + shared helpers |
| `docs/` | GitHub Pages landing site |

## Guidelines

- **Keep the adapter pattern.** App code depends on the interfaces in
  `src/lib/*`, never on a concrete provider. New providers = new adapters.
- **Config over forking.** Anything a company might tune belongs in env vars.
- **No secrets in code.** Ever.
- One focused change per PR. Describe the _why_, not just the _what_.

## Good first issues

Look for the [`good first issue`](https://github.com/ranjan98/karmalms/labels/good%20first%20issue)
label. New provider adapters (storage, LLM, directory sync) and UI polish
are great entry points.

## Code of Conduct

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
