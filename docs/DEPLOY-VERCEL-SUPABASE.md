# Deploy NexusServer — Vercel + Supabase (marketing / demo)

Environment untuk **landing page, CMS, dan login demo**. Production platform penuh tetap di VPS (Contabo + Coolify).

## Ringkasan

| Komponen | Layanan |
|----------|---------|
| App (Next.js) | [Vercel](https://vercel.com) — Hobby gratis, private GitHub OK |
| Database | [Supabase](https://supabase.com) — Free tier |
| File upload CMS | Asset di `public/uploads/` di repo (upload baru di Vercel tidak permanen) |

## 1. Supabase

1. Buat project di [supabase.com/dashboard](https://supabase.com/dashboard).
2. **Project Settings → Database** → salin dua connection string:
   - **Transaction pooler** (port `6543`) → `DATABASE_URL`
   - **Direct** atau **Session** (port `5432`) → `DIRECT_URL`
3. Di komputer lokal:

```bash
cp .env.supabase.example .env.supabase
# Edit .env.supabase — isi DATABASE_URL + DIRECT_URL
npm run db:setup:supabase
```

Ini menjalankan `prisma db push` + seed (admin & user demo).

**Kredensial demo setelah seed:**

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@nexus.id` | `admin123` |
| User | `reseller@demo.id` | `user1234` |

## 2. Generate secrets

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -base64 32   # DATA_ENCRYPTION_KEY
openssl rand -base64 32   # CRON_SECRET
```

## 3. Vercel + GitHub private

1. Push repo ke **GitHub private**.
2. [vercel.com/new](https://vercel.com/new) → **Import** repo.
3. Saat connect GitHub: beri akses ke repo private (Vercel GitHub App).
4. **Framework:** Next.js (auto).
5. **Build Command:** `prisma generate && next build` (sudah di `vercel.json`).
6. **Environment Variables:** salin dari [`.env.vercel.example`](../.env.vercel.example) — isi semua nilai.
7. Deploy.

Setelah deploy pertama, buka URL Vercel — jika DB sudah di-seed, landing & login harus jalan.

## 4. Custom domain

1. Vercel → **Settings → Domains** → tambah domain.
2. Set DNS (CNAME) sesuai instruksi Vercel.
3. Update di Environment Variables:

```
AUTH_URL=https://demo.domainanda.com
NEXTAUTH_URL=https://demo.domainanda.com
NEXT_PUBLIC_APP_URL=https://demo.domainanda.com
```

4. **Redeploy** (Deployments → … → Redeploy).

## 5. Perilaku di Vercel

- **Background schedulers** tidak jalan di Vercel kecuali `ENABLE_BACKGROUND_JOBS=true` (lihat `src/instrumentation.ts`).
- Untuk demo, biarkan scheduler **off** (lihat `.env.vercel.example`).
- **Cron** di `vercel.json` (`/api/cron/imei-orders`, webhooks) hanya relevan jika Anda menguji order; Hobby plan punya limit cron.
- **Backup admin** (`pg_dump`) tidak berjalan di Vercel — gunakan export manual di Supabase.
- **Upload media** baru ke `/public/uploads` bisa hilang setelah redeploy — untuk demo pakai asset yang sudah di-commit di repo.

## 6. Deploy ulang

Setiap push ke branch production (biasanya `main`) → Vercel build otomatis.

## 7. Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Build gagal Prisma | Pastikan `postinstall` / `vercel.json` build command ada `prisma generate` |
| `DATA_ENCRYPTION_KEY is required` | Set di Vercel env, redeploy |
| Login redirect loop / salah host | `AUTH_URL` & `NEXTAUTH_URL` harus sama dengan URL browser |
| `Can't reach database` | Cek `DATABASE_URL` pooler; untuk push schema pakai `DIRECT_URL` |
| `prepared statement` error saat db push | Jangan pakai pooler untuk `db push` — pakai `DIRECT_URL` |
| Supabase project paused | Buka dashboard Supabase → Resume (Free tier pause setelah 1 minggu idle) |
| Tabel tidak ada | Jalankan `npm run db:setup:supabase` lagi |

## 8. Production platform (GHCR / VPS)

Gunakan **Contabo Cloud VPS 10 + Coolify** (atau PM2) dengan image **GHCR** yang terdaftar di Nexus Portal — bukan Vercel.

- Env template: [`.env.coolify.example`](../.env.coolify.example)
- **Web Push:** generate VAPID keys (`npx web-push generate-vapid-keys`) per install customer
- Schedulers, backup, order polling: aktif di VPS (`ENABLE_BACKGROUND_JOBS=true`)

Jangan mengandalkan Vercel untuk order/wallet/backup production.
