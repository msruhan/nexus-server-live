# Repository split — NexusServer

Two GitHub repos serve different deployment targets:

| Repo | URL | Purpose |
|------|-----|---------|
| **nexusserver** | https://github.com/msruhan/nexusserver | Marketing / demo on **Vercel + Supabase**. Schedulers off, ephemeral uploads. Tag: `vercel-baseline-2026-06-05`. |
| **nexus-server-live** | https://github.com/msruhan/nexus-server-live | **Production customer VPS** via **Coolify + PostgreSQL** on same server. Full platform. |

## Which repo to use?

- **Vercel demo, landing, CMS preview** → `nexusserver` + [DEPLOY-VERCEL-SUPABASE.md](./docs/DEPLOY-VERCEL-SUPABASE.md)
- **Paid customer white-glove install** → `nexus-server-live` + [DEPLOY-COOLIFY.md](./docs/DEPLOY-COOLIFY.md)

## Syncing changes

Application code starts from the same baseline (`17df3f8`). Feature fixes may be cherry-picked or merged between repos until a shared monorepo or submodule strategy is adopted.

Coolify-specific files exist **only** in `nexus-server-live`:

- `Dockerfile`, `docker-compose.production.yml`
- `.env.coolify.example`
- `docs/DEPLOY-COOLIFY.md`
- `src/app/api/health/route.ts`
- `scripts/setup-production.mjs`

## Local development

Same as nexusserver:

```bash
npm install
npm run db:setup
npm run dev
```

Production setup script:

```bash
npm run db:setup:production
```
