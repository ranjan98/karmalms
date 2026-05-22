<div align="center">

<img src="docs/assets/banner.svg" alt="KarmaLMS — the open-source LMS built for corporate training" width="760" />

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
![Stack](https://img.shields.io/badge/stack-Next.js%20%C2%B7%20Postgres%20%C2%B7%20TypeScript-111)

[Landing page](https://ranjan98.github.io/karmalms/) · [Quickstart](#quickstart) · [Architecture](#architecture) · [Roadmap](#roadmap) · [Contributing](CONTRIBUTING.md)

</div>

<div align="center">
  <img src="docs/assets/hero-dashboard.svg" alt="KarmaLMS dashboard — onboarding program with course progress and compliance tracking" width="820" />
</div>

---

## Why KarmaLMS?

Almost every open-source LMS (Moodle, Open edX, Chamilo) is built for **schools** —
semesters, gradebooks, enrollment periods. Companies then bend those tools
painfully into doing employee onboarding and compliance training.

KarmaLMS is built for the **company** case from line one:

- **Onboarding paths** — sequenced courses auto-assigned by role, team, or start date.
- **Compliance tracking** — certifications with expiry dates and automatic lapse reminders.
- **Manager dashboards** — see who on your team is overdue, at a glance.
- **Runs on your infrastructure** — your AWS account, your S3, your identity provider.

## Bring your own everything

KarmaLMS owns as little as possible. Pluggable adapters mean it slots into
infrastructure a company already has — configured by environment variables, no fork:

| Adapter | What you plug in | Modes |
|---|---|---|
| **Auth** | Your identity provider — KarmaLMS never stores passwords | `oidc` (Cognito/Okta/Azure AD/Auth0), `trusted-jwt` (append to your existing portal session), `saml` |
| **Storage** | Your object storage | S3-compatible: AWS S3, MinIO, Cloudflare R2 |
| **LLM** | Your AI provider — or none | `bedrock` (runs in your own AWS — data stays in your VPC), `openai`, `none` |
| **Directory** | Your HRIS, for employee sync — or none | `bamboohr`, `none` |

The whole app depends only on these interfaces. Swapping a provider is a config
change, not a code change. See [`src/lib/`](src/lib/).

## Quickstart

```bash
git clone https://github.com/ranjan98/karmalms.git
cd karmalms
cp .env.example .env
docker compose up
```

That boots the app, a Postgres (pgvector) database, and a MinIO S3 — **no AWS
account needed to try it**. Open <http://localhost:3000>.

## Local setup without Docker

KarmaLMS needs one thing: a **Postgres database**. (S3 is only used for
uploaded branding logos — everything else runs without it. pgvector is not
required yet.)

**1. Get a Postgres database** — either is fine:

- *Hosted (no install):* create a free database at [Neon](https://neon.tech)
  or [Supabase](https://supabase.com) and copy its connection string.
- *Local:* install Postgres (e.g. [Postgres.app](https://postgresapp.com) on
  macOS, or `brew install postgresql@16`) and create a database:
  `createdb karmalms`.

**2. Configure and run:**

```bash
cp .env.example .env
# edit .env → set DATABASE_URL to your Postgres connection string
#   hosted: postgres://user:pass@host/db?sslmode=require
#   local:  postgres://localhost:5432/karmalms
npm install
npm run db:migrate   # apply the schema
npm run db:seed      # load a demo org + users + a course
npm run dev
```

Open <http://localhost:3000>. (If port 3000 is busy, Next picks another —
or pin one with `npm run dev -- -p 3100` and set `APP_URL` to match.)

**3. Sign in.** The default `AUTH_MODE=dev` needs no SSO — the login page
lists the seeded accounts; click one:

| Account | Role |
|---|---|
| `admin@acme.test` | admin — author courses, assign, branding |
| `manager@acme.test` | manager — reporting |
| `learner@acme.test` | learner — take assigned courses |

For production SSO instead, set `AUTH_MODE=oidc` and the `OIDC_*` variables
(see `.env.example`).

## Architecture

```
Next.js (App Router, TypeScript)  ──  one deployable
        │
        ├── Auth adapter      → your IdP        (src/lib/auth)
        ├── Storage adapter   → your S3         (src/lib/storage)
        ├── LLM adapter       → your AI / none  (src/lib/llm)
        ├── Directory adapter → your HRIS       (src/lib/directory)
        └── Postgres + pgvector (Drizzle ORM)   (src/db)
```

- **No separate backend** — one Next.js app is far simpler for companies to deploy.
- **12-factor config** — every tunable is an env var; no secrets in code.
- **JIT user provisioning** — a user row is just `{ external_id, email, role, org }`.

## Customize without forking

- **Branding** — logo, colors, app name via env vars.
- **Theming** — the brand color is a CSS variable; override one file.
- **Login page** — fully replaceable component (and in `trusted-jwt` mode there is no login page at all).
- **Webhooks & REST API** — integrate with your HRIS/Slack without touching core.

## Roadmap

| Version | Focus | Status |
|---|---|---|
| **v0.1** | Course authoring → publish → assign → learners complete lessons → quizzes gate completion → manager reporting. OIDC + trusted-JWT SSO, S3 storage, light/dark theming, in-app company branding, `docker compose up`. | ✅ Built |
| **v0.2** | **Certifications with expiry + lapse reminders** (the headline feature). **AI course authoring** — paste a doc → drafted lessons + quiz. | ✅ Built |
| **v0.3** | AI tutor (RAG grounded in course content), webhooks, REST API tokens, SAML adapter. | ✅ Built |
| **v0.4** | SCIM provisioning, org analytics, rate limiting, scoped API tokens, session revocation. | ✅ Built |

See [open issues](https://github.com/ranjan98/karmalms/issues) and
[`good first issue`](https://github.com/ranjan98/karmalms/labels/good%20first%20issue).

## Contributing

Contributions are very welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) and our
[Code of Conduct](CODE_OF_CONDUCT.md). Good first issues are labeled.

## License

[MIT](LICENSE) — use it, modify it, ship it.
