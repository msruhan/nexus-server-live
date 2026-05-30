# PRD — Website IMEI Services & Server Services (DhruFusion Integration)

**Versi:** 1.0  
**Tanggal:** 26 Mei 2026  
**Tujuan:** Dokumen referensi lengkap untuk membangun website standalone layanan IMEI Services dan Server Services dengan integrasi DhruFusion API.

---

## 1. Product Overview

### 1.1 Deskripsi Produk
Website ini menyediakan **dua layanan utama**:
- **IMEI Services** — Layanan berbasis IMEI (cek status, unlock network, iCloud removal, dll.)
- **Server Services** — Layanan berbasis server/file (flashing, bypass FRP, software repair, dll.)

Kedua layanan menggunakan **DhruFusion API** sebagai satu-satunya supplier/source.

### 1.2 Apa yang TIDAK Termasuk
- Marketplace produk fisik
- Konsultasi / remote assistance
- Rekber (escrow) antar user
- Inspeksi perangkat
- Chat system
- Topup digital (game, pulsa)

### 1.3 Tujuan Bisnis
1. Menyediakan platform self-service untuk user order layanan IMEI/server.
2. Admin cukup konfigurasi API provider dan harga — operasional jalan otomatis.
3. Sistem polling otomatis memantau status order dari DhruFusion dan update ke user.
4. Revenue dari margin harga (harga jual > harga beli dari supplier).

---

## 2. User Personas & Access Model

### 2.1 Personas

| Persona | Akses | Deskripsi |
|---------|-------|-----------|
| **Guest** | Public pages | Bisa lihat katalog layanan, harga, dan info. Tidak bisa order. |
| **User** | Authenticated | Bisa order layanan, lihat riwayat, topup wallet, cek status order. |
| **Admin** | Full access | Kelola API provider, service catalog, pricing, monitoring order, user management. |

### 2.2 RBAC Rules
- `/admin/*` — Hanya role ADMIN.
- `/user/*` — Hanya role USER (authenticated).
- `/` dan `/services/*` — Public (guest & authenticated).
- Order creation — Hanya USER yang sudah login.

---

## 3. Requirements (User Stories & Acceptance Criteria)

### 3.1 User Stories — Guest/Public

| ID | User Story | Acceptance Criteria |
|----|-----------|---------------------|
| US-01 | Sebagai guest, saya ingin melihat daftar layanan IMEI yang tersedia beserta harganya | WHEN guest mengakses halaman katalog THEN daftar service ditampilkan grouped by kategori dengan harga, estimasi waktu, dan deskripsi |
| US-02 | Sebagai guest, saya ingin melihat daftar layanan Server yang tersedia | WHEN guest mengakses halaman server services THEN daftar service ditampilkan dengan harga dan deskripsi |
| US-03 | Sebagai guest, saya ingin mendaftar akun | WHEN guest submit form register dengan email & password valid THEN akun dibuat dengan role USER |

### 3.2 User Stories — User (Customer)

| ID | User Story | Acceptance Criteria |
|----|-----------|---------------------|
| US-10 | Sebagai user, saya ingin melakukan order IMEI service | WHEN user memilih service, mengisi IMEI + field required, dan membayar THEN order dibuat dengan status PENDING dan dikirim ke DhruFusion |
| US-11 | Sebagai user, saya ingin melakukan order Server service | WHEN user memilih server service, mengisi field required THEN order dibuat dan dikirim ke source |
| US-12 | Sebagai user, saya ingin melihat status order saya | WHEN user buka halaman order detail THEN status terkini ditampilkan (PENDING/IN_PROCESS/SUCCESS/REJECTED/CANCELLED) beserta result jika sudah selesai |
| US-13 | Sebagai user, saya ingin melihat riwayat semua order | WHEN user buka halaman riwayat THEN semua order ditampilkan dengan filter status dan pagination |
| US-14 | Sebagai user, saya ingin topup saldo wallet | WHEN user submit topup request THEN admin approve dan saldo bertambah |
| US-15 | Sebagai user, saya ingin bayar order dengan saldo wallet | WHEN user checkout dan saldo cukup THEN saldo dipotong dan order terproses |
| US-16 | Sebagai user, saya ingin bayar langsung tanpa wallet (direct payment) | WHEN user memilih metode pembayaran langsung THEN diarahkan ke payment gateway dan order terproses setelah payment confirmed |
| US-17 | Sebagai user, saya ingin menerima notifikasi saat order selesai | WHEN status order berubah ke SUCCESS/REJECTED THEN user mendapat notifikasi (email/in-app) |

### 3.3 User Stories — Admin

| ID | User Story | Acceptance Criteria |
|----|-----------|---------------------|
| US-20 | Sebagai admin, saya ingin menambah/edit/hapus API provider | WHEN admin submit form API provider THEN data tersimpan (host, username, apiKey, status) dan bisa ditest koneksi |
| US-21 | Sebagai admin, saya ingin mengelola service group/kategori | WHEN admin CRUD service group THEN perubahan reflected di katalog publik |
| US-22 | Sebagai admin, saya ingin mengelola individual IMEI service | WHEN admin CRUD service (harga jual, service ID dari Dhru, required fields) THEN service muncul/hilang dari katalog |
| US-23 | Sebagai admin, saya ingin mengelola server service | WHEN admin CRUD server service THEN perubahan reflected |
| US-24 | Sebagai admin, saya ingin memonitor semua order | WHEN admin buka dashboard order THEN semua order terlihat dengan filter status, tanggal, dan user |
| US-25 | Sebagai admin, saya ingin cancel/refund order | WHEN admin cancel order yang masih PENDING/IN_PROCESS THEN saldo di-refund ke user wallet |
| US-26 | Sebagai admin, saya ingin approve topup wallet user | WHEN admin approve topup request THEN saldo user bertambah sesuai nominal |
| US-27 | Sebagai admin, saya ingin melihat statistik (order per hari, revenue, success rate) | WHEN admin buka dashboard THEN statistik ditampilkan |
| US-28 | Sebagai admin, saya ingin test koneksi ke API provider | WHEN admin klik "Test Connection" THEN sistem memanggil endpoint balance/account info dari Dhru dan menampilkan hasilnya |
| US-29 | Sebagai admin, saya ingin sinkronisasi daftar service dari Dhru | WHEN admin klik "Sync Services" THEN sistem fetch service list dari API dan menampilkan untuk di-import |

### 3.4 User Stories — Admin (Content Management / CMS)

| ID | User Story | Acceptance Criteria |
|----|-----------|---------------------|
| US-30 | Sebagai admin, saya ingin mengatur nama site, logo, favicon, dan tagline | WHEN admin submit form site settings THEN perubahan langsung reflected di frontend |
| US-31 | Sebagai admin, saya ingin memilih tema (light/dark/system) dan warna primer | WHEN admin ubah theme mode atau primary color THEN seluruh website berubah warna secara real-time |
| US-32 | Sebagai admin, saya ingin menyusun section landing page (tambah, hapus, reorder) | WHEN admin drag-and-drop section THEN urutan section berubah di landing page publik |
| US-33 | Sebagai admin, saya ingin menambah section baru ke landing page | WHEN admin pilih tipe section dan isi konten THEN section baru muncul di posisi yang ditentukan |
| US-34 | Sebagai admin, saya ingin mengedit konten setiap section (teks, gambar, link) | WHEN admin edit konten section THEN perubahan langsung terlihat di frontend |
| US-35 | Sebagai admin, saya ingin mengatur visibility section (show/hide) tanpa hapus | WHEN admin toggle visibility OFF THEN section tidak muncul di publik tapi data tetap tersimpan |
| US-36 | Sebagai admin, saya ingin upload dan manage banner/slider | WHEN admin upload gambar banner, set link, dan jadwal tayang THEN banner tampil di posisi yang ditentukan sesuai jadwal |
| US-37 | Sebagai admin, saya ingin membuat running ads/ticker text | WHEN admin tambah running text THEN teks berjalan muncul di website sesuai posisi yang dipilih |
| US-38 | Sebagai admin, saya ingin mengatur menu navigasi (header, footer, mobile) | WHEN admin tambah/edit/reorder menu item THEN navigasi di frontend berubah |
| US-39 | Sebagai admin, saya ingin mengelola FAQ | WHEN admin CRUD FAQ item dengan kategori THEN FAQ section di frontend ter-update |
| US-40 | Sebagai admin, saya ingin mengelola testimonial | WHEN admin CRUD testimonial (nama, foto, rating, komentar) THEN testimonial section berubah |
| US-41 | Sebagai admin, saya ingin upload media (gambar/file) ke library | WHEN admin upload file THEN file tersimpan di storage (R2/S3) dan URL bisa dipakai di mana saja |
| US-42 | Sebagai admin, saya ingin membuat halaman custom (About, T&C, Privacy) | WHEN admin buat page dengan slug, judul, dan konten HTML/Markdown THEN halaman bisa diakses di `/{slug}` |
| US-43 | Sebagai admin, saya ingin mengatur SEO (meta title, description, OG image) | WHEN admin edit SEO settings THEN meta tags di-render di head HTML |
| US-44 | Sebagai admin, saya ingin mengatur social media links | WHEN admin isi link social media THEN icon/link muncul di footer dan header |
| US-45 | Sebagai admin, saya ingin mengaktifkan/menonaktifkan fitur tertentu (registrasi, direct payment, dll) | WHEN admin toggle feature flag THEN fitur aktif/nonaktif secara instan tanpa deploy ulang |
| US-46 | Sebagai admin, saya ingin mengaktifkan maintenance mode | WHEN admin aktifkan maintenance THEN semua halaman publik menampilkan pesan maintenance, admin tetap bisa akses |
| US-47 | Sebagai admin, saya ingin melihat analytics banner (klik & view count) | WHEN admin buka detail banner THEN statistik klik dan view ditampilkan |
| US-48 | Sebagai admin, saya ingin preview perubahan sebelum publish | WHEN admin klik "Preview" THEN halaman ditampilkan dengan perubahan tanpa publish ke publik |

---

## 4. Arsitektur Sistem

### 4.1 Tech Stack
- **Framework:** Next.js (App Router)
- **Runtime:** Node.js >= 22
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** NextAuth.js (credentials + optional OAuth)
- **Styling:** Tailwind CSS 3.4+
- **Validation:** Zod
- **Background Jobs:** In-process scheduler via `instrumentation.ts`

#### UI/UX & Animation Dependencies

| Package | Versi | Fungsi |
|---------|-------|--------|
| `framer-motion` | ^11 | Animasi halaman, komponen, transitions, scroll-triggered reveals, layout animations, gesture interactions |
| `@phosphor-icons/react` | ^2.1 | Icon library premium (duotone, fill, thin, bold, regular) |
| `class-variance-authority` | ^0.7 | Variant-based component styling (button, badge, card variants) |
| `clsx` + `tailwind-merge` | latest | Utility classname composition |
| `sonner` | ^2 | Toast notifications modern (stacking, swipe to dismiss) |
| `@radix-ui/react-dialog` | latest | Accessible modal/dialog primitives |
| `@radix-ui/react-dropdown-menu` | latest | Dropdown menu primitives |
| `@radix-ui/react-tabs` | latest | Tab component primitives |
| `@radix-ui/react-tooltip` | latest | Tooltip primitives |
| `@radix-ui/react-accordion` | latest | FAQ accordion primitives |
| `@radix-ui/react-switch` | latest | Toggle switch primitives |
| `@radix-ui/react-select` | latest | Custom select dropdown |
| `@dnd-kit/core` + `@dnd-kit/sortable` | latest | Drag-and-drop untuk page builder, reorder sections/menus |
| `react-hot-toast` atau `sonner` | latest | Notifikasi |
| `apexcharts` + `react-apexcharts` | ^5 | Chart dashboard admin (area, bar, donut) |
| `@tiptap/react` + extensions | latest | Rich text editor untuk custom pages (WYSIWYG) |
| `embla-carousel-react` | latest | Carousel/slider untuk banner (touch-friendly, autoplay) |
| `react-dropzone` | latest | Drag-and-drop file upload (media library) |
| `sharp` | latest | Image optimization server-side |
| `next-themes` | latest | Dark/light/system theme management (SSR-safe) |

### 4.2 Arsitektur High-Level

```
┌─────────────────────────────────────────────────────────┐
│                       FRONTEND                           │
│  Landing | Katalog | Order Form | User Dashboard | Admin │
└──────────────────────┬──────────────────────────────────┘
                       │ API Routes (/api/*)
┌──────────────────────▼──────────────────────────────────┐
│                     BACKEND                               │
│  Auth | Order Service | Wallet | Admin | Dhru Client     │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   PostgreSQL    DhruFusion API   Payment Gateway
   (Prisma)      (External)       (Optional)
```

### 4.3 Background Jobs (Cron/Scheduler)

```
instrumentation.ts
├── IMEI Order Poller     (interval: 60 detik)
│   └── Poll status semua order PENDING & IN_PROCESS
├── Server Order Poller   (interval: 60 detik)
│   └── Poll status semua server order PENDING & IN_PROCESS
└── Stale Order Checker   (interval: 5 menit)
    └── Tandai order > 72 jam tanpa update sebagai STALE
```

---

## 4A. UI/UX Design System & Visual Standards

> **Prinsip utama:** Website ini TIDAK boleh terlihat generic/basic/AI-generated. Harus terasa premium, smooth, dan modern — setara kualitas SaaS product top-tier.

### 4A.1 Design Philosophy

1. **Depth & Layering** — Gunakan backdrop-blur, glassmorphism, dan soft shadows untuk kedalaman. Bukan flat card polos.
2. **Motion Everything** — Setiap interaksi punya feedback animasi. Scroll reveals, hover states, page transitions, loading states.
3. **Gradient Accents** — Bukan warna solid saja. Gunakan gradient subtle (primary → accent) di elemen kunci.
4. **Micro-interactions** — Button press scale, card hover lift, input focus glow, toggle slide, counter count-up.
5. **Negative Space** — Spacing generous. Jangan packed. Beri ruang napas antar elemen.
6. **Typography Hierarchy** — Gunakan font weight extreme (font-black untuk heading, font-medium untuk body). Tracking-tight di judul besar.
7. **Responsive First** — Mobile-first design. Breakpoints: sm(640), md(768), lg(1024), xl(1280).

### 4A.2 Animasi Pattern (Framer Motion)

#### Page-Level
```typescript
// Layout route transitions
const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
}
```

#### Scroll Reveal (viewport-triggered)
```typescript
// Reveal saat masuk viewport
const reveal = {
  hidden: { opacity: 0, y: 28, filter: 'blur(8px)' },
  show: { 
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
  }
}

// Stagger children
const stagger = {
  show: { transition: { staggerChildren: 0.08 } }
}
```

#### Interactive
```typescript
// Card hover — lift + shadow
whileHover={{ y: -4, boxShadow: '0 20px 40px -12px rgba(0,0,0,0.15)' }}

// Button press
whileTap={{ scale: 0.96 }}

// Number counter
animate(motionValue, targetNumber, { duration: 1.4, ease: [0.16, 1, 0.3, 1] })
```

#### Background
```typescript
// Floating ambient orbs
animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}

// Aurora / mesh gradient
// Implementasi: CSS conic-gradient + blur yang bergerak halus
```

### 4A.3 Komponen UI Wajib (Custom, Bukan Default)

| Komponen | Behavior | Visual |
|----------|----------|--------|
| **Button** | `whileTap={{ scale: 0.96 }}`, loading spinner, gradient variant | Rounded-full/rounded-xl, padding generous, shadow-glow pada primary |
| **Card** | Hover lift (y:-4), spotlight follow cursor, glassmorphism | Border subtle, backdrop-blur, shadow-soft, overflow-hidden rounded-2xl/3xl |
| **Input** | Focus ring glow (ring-primary/20), animated label float | Rounded-xl, padding comfortable, subtle border |
| **Badge** | Entry animation (scale spring), variant colors | Rounded-full, font-bold, ring-inset pattern |
| **Modal/Dialog** | AnimatePresence enter/exit, backdrop blur overlay | Rounded-3xl, max-w-md, soft shadow, slide-up on mobile |
| **Toast** | Slide from right, stack, auto-dismiss, swipe gesture | Rounded-xl, icon + text, progress bar |
| **Table** | Row hover highlight, skeleton loading, empty state illustration | Rounded-2xl container, alternating subtle bg |
| **Tabs** | Animated indicator pill (layoutId), smooth content transition | Rounded-full pill tabs, spring animation |
| **Accordion** | Smooth height transition, rotate chevron icon | Rounded-xl items, divider between |
| **Dropdown** | Scale + opacity enter, spring physics | Rounded-xl, shadow-soft-lg, blur backdrop |
| **Sidebar** | Collapse/expand with width animation, menu item hover slide | Fixed/sticky, glass bg, icon+label |
| **Skeleton** | Pulse + shimmer gradient sweep | Rounded matching target element, surface-100/200 |
| **Empty State** | Illustrated SVG + fade-in text | Centered, muted illustration, CTA button |
| **Progress Bar** | Width transition + shimmer sweep on active segment | Rounded-full, gradient fill, backdrop |
| **Counter/Stat** | Count-up animation on viewport entry | Tabular-nums, font-black, large size |
| **Banner Carousel** | Embla carousel, autoplay, dots indicator, swipe | Rounded-2xl, aspect ratio, overlay gradient |

### 4A.4 Tema & Warna (next-themes + CSS Variables)

```css
/* Light mode (default) */
:root {
  --color-primary-50: #ecfdf5;
  --color-primary-500: #10b981;
  --color-primary-700: #047857;
  --color-accent-500: #06b6d4;
  --color-surface-50: #f8fafc;
  --color-surface-100: #f1f5f9;
  --color-surface-200: #e2e8f0;
  --color-ink: #0f172a;
  --color-ink-muted: #64748b;
  --shadow-soft-xs: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
  --shadow-soft-sm: 0 4px 12px -4px rgba(0,0,0,0.08);
  --shadow-soft-lg: 0 24px 48px -16px rgba(0,0,0,0.12);
  --shadow-glow-primary: 0 8px 24px -8px rgba(16,185,129,0.4);
}

/* Dark mode */
.dark {
  --color-primary-50: #064e3b;
  --color-primary-500: #34d399;
  --color-primary-700: #6ee7b7;
  --color-surface-50: #0f172a;
  --color-surface-100: #1e293b;
  --color-surface-200: #334155;
  --color-ink: #f8fafc;
  --color-ink-muted: #94a3b8;
  --shadow-soft-xs: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-soft-lg: 0 24px 48px -16px rgba(0,0,0,0.5);
  --shadow-glow-primary: 0 8px 24px -8px rgba(52,211,153,0.3);
}
```

**Implementasi via `next-themes`:**
- Server-safe (no flash of wrong theme)
- Persisted di localStorage
- Respects system preference
- Admin bisa override default via SiteSettings

### 4A.5 Landing Page Composition Guide

Landing page dibuild dari `PageSection` records. Urutan default yang direkomendasikan:

```
1. [running_ads]     — Running ticker di paling atas (opsional)
2. [hero]            — Hero section (heading besar, CTA, visual/ilustrasi)
3. [stats]           — Counter statistik (animasi count-up saat scroll)
4. [features]        — Grid fitur utama (6-item grid, icon + heading + desc)
5. [service_catalog] — Katalog service interaktif (tabs IMEI/Server)
6. [banner_slider]   — Carousel promo (autoplay, swipe)
7. [testimonials]    — Slider testimonial customer
8. [faq]             — Accordion FAQ
9. [cta]             — Final call-to-action (gradient bg, button besar)
10. [partners]       — Logo brand marquee
```

Semua section bisa di-reorder, ditambah, dihapus, atau di-hide oleh admin.

### 4A.6 Elemen Premium yang Wajib Ada

| Elemen | Lokasi | Implementasi |
|--------|--------|------------|
| **Ambient orbs/blobs** | Background halaman utama | 2-3 div blur-[100px] dengan gradient yang bergerak halus |
| **Glass navbar** | Fixed top | backdrop-blur-md, border-b border-white/10, bg-white/80 |
| **Scroll progress** | Top bar / heading | `useScroll()` → width progress bar di top |
| **Magnetic buttons** | CTA utama | Cursor proximity → button subtly follows mouse |
| **Spotlight card** | Service cards | Radial gradient follows cursor position on hover |
| **Animated numbers** | Stat counters, wallet balance | Count-up dari 0 ke target saat pertama terlihat |
| **Skeleton loading** | Semua data-fetching states | Pulse + shimmer (bukan spinner) |
| **Page transition** | Route changes | Fade + slide via framer AnimatePresence |
| **Dark mode toggle** | Navbar/settings | Sun ↔ Moon icon rotate transition |
| **Notification badge** | Bell icon di navbar | Scale-in spring + pulse dot |
| **Status pills** | Order status | Color-coded, subtle glow, icon prefix |
| **Empty states** | Halaman kosong | SVG illustration + helpful message + CTA |
| **Success confetti** | Order berhasil | Particle burst animasi saat order submitted |
| **Copy to clipboard** | Order result/code | Click → checkmark morph → toast "Copied!" |
| **Parallax hero** | Landing hero section | useScroll → translateY content & background berbeda speed |

### 4A.7 Admin Panel Design

Admin panel juga harus modern (bukan template admin boring):

- **Sidebar:** Collapsible, icon + label, active indicator animasi, section dividers
- **Dashboard:** Cards dengan sparkline mini charts, animated counters, status overview
- **Tables:** Rounded container, row hover, inline actions, bulk select
- **Forms:** Floating labels, step indicator untuk multi-step, inline validation
- **Page Builder:** Visual drag-and-drop grid, section preview thumbnails, live preview panel
- **Media Library:** Grid view + list view toggle, drag-to-upload area, image preview modal
- **Settings:** Grouped cards per kategori, toggle switches dengan smooth state, color picker

### 4A.8 Anti-Pattern (JANGAN Dilakukan)

| ❌ Jangan | ✅ Sebagai gantinya |
|-----------|---------------------|
| Card dengan border-1 bg-white tanpa shadow | Rounded-2xl, shadow-soft, backdrop-blur, border-subtle |
| Button `bg-blue-500 text-white` polos | Gradient + shadow-glow + whileTap scale + rounded-full |
| Loading spinner di tengah halaman | Skeleton shimmer yang match layout target |
| Alert merah kotak di atas form | Toast notification slide-in + auto-dismiss |
| Halaman putih polos tanpa visual interest | Ambient orbs, gradient background, section separators |
| Font size seragam semua body | Hierarchy extreme (text-4xl font-black → text-sm font-medium) |
| Static content tanpa motion | Scroll reveal, hover lift, counter animation, page transition |
| Generic modal `<div className="fixed">` | Radix Dialog + AnimatePresence + backdrop-blur |
| Form tanpa feedback | Inline validation, success checkmark, disabled state |

---

## 5. Data Model (Prisma Schema)

### 5.1 Auth & User

```prisma
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  password      String    // bcrypt hashed
  role          UserRole  @default(USER)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  wallet        Wallet?
  imeiOrders    ImeiOrder[]
  serverOrders  ServerOrder[]
}

enum UserRole {
  ADMIN
  USER
}
```

### 5.2 Wallet & Ledger

```prisma
model Wallet {
  id        String   @id @default(cuid())
  userId    String   @unique
  balance   Decimal  @default(0) @db.Decimal(14, 0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user   User           @relation(fields: [userId], references: [id])
  ledger WalletLedger[]
}

model WalletLedger {
  id          String     @id @default(cuid())
  walletId    String
  type        LedgerType
  amount      Decimal    @db.Decimal(14, 0)
  balance     Decimal    @db.Decimal(14, 0) // balance setelah transaksi ini
  description String?
  referenceId String?    // ID order terkait
  createdAt   DateTime   @default(now())

  wallet Wallet @relation(fields: [walletId], references: [id])
}

enum LedgerType {
  TOPUP
  PAYMENT
  REFUND
}
```

### 5.3 API Provider (DhruFusion)

```prisma
model ImeiApi {
  id        String        @id @default(cuid())
  title     String        // Nama provider (misal: "DhruFusion Main")
  host      String        // URL base API (misal: "https://dhru.example.com")
  username  String        // Username akun Dhru
  apiKey    String        @db.Text // API access key
  status    ApiStatus     @default(ACTIVE)
  balance   Decimal?      @db.Decimal(14, 2) // Saldo terakhir di supplier
  lastSync  DateTime?     // Terakhir sync balance
  notes     String?       @db.Text
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  imeiServices   ImeiService[]
  serverServices ServerService[]
}

enum ApiStatus {
  ACTIVE
  INACTIVE
}
```

### 5.4 IMEI Service

```prisma
model ImeiServiceGroup {
  id          String   @id @default(cuid())
  title       String   // Nama grup (misal: "Samsung Unlock", "iPhone iCloud")
  description String?  @db.Text
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  services ImeiService[]
}

model ImeiService {
  id           String   @id @default(cuid())
  apiId        String   // Relasi ke ImeiApi provider
  groupId      String   // Relasi ke ImeiServiceGroup
  externalId   String   // Service ID di DhruFusion (untuk dikirim ke API)
  title        String   // Nama layanan (misal: "Samsung S24 T-Mobile Unlock")
  description  String?  @db.Text
  buyPrice     Decimal  @db.Decimal(12, 2) // Harga beli dari supplier (USD/IDR)
  sellPrice    Decimal  @db.Decimal(12, 0) // Harga jual ke user (IDR)
  deliveryTime String?  // Estimasi (misal: "1-48 jam")
  status       ServiceStatus @default(ACTIVE)

  // Required input fields — toggle mana yang harus diisi user
  requiresImei     Boolean @default(true)
  requiresNetwork  Boolean @default(false)
  requiresModel    Boolean @default(false)
  requiresProvider Boolean @default(false)
  requiresPin      Boolean @default(false)
  requiresKbh      Boolean @default(false)
  requiresMep      Boolean @default(false)
  requiresPrd      Boolean @default(false)
  requiresSn       Boolean @default(false)
  requiresEmail    Boolean @default(false)
  requiresNote     Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  api    ImeiApi          @relation(fields: [apiId], references: [id])
  group  ImeiServiceGroup @relation(fields: [groupId], references: [id])
  orders ImeiOrder[]
}

enum ServiceStatus {
  ACTIVE
  INACTIVE
}
```

### 5.5 IMEI Order

```prisma
model ImeiOrder {
  id         String          @id @default(cuid())
  orderCode  String          @unique // "IMEI-YYYYMMDD-XXXXXX"
  userId     String
  serviceId  String
  status     ImeiOrderStatus @default(PENDING)
  price      Decimal         @db.Decimal(12, 0) // Harga yang dibayar user

  // Input fields
  imei         String
  network      String?
  model        String?
  provider     String?
  pin          String?
  kbh          String?
  mep          String?
  prd          String?
  serialNumber String?
  email        String?
  note         String?  @db.Text

  // Response from Dhru
  externalOrderId String?  // Order ID dari DhruFusion (ID yang dikembalikan saat place order)
  resultCode      String?  @db.Text // Unlock code / hasil dari supplier
  resultComments  String?  @db.Text // Komentar/catatan dari supplier
  
  // Payment
  paymentMethod   String?  // "wallet" | "direct"
  paymentRef      String?  // Reference payment gateway (jika direct)

  // Timestamps
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  submittedAt DateTime? // Kapan dikirim ke Dhru
  processedAt DateTime? // Kapan status berubah ke IN_PROCESS
  completedAt DateTime? // Kapan status berubah ke SUCCESS/REJECTED

  user    User        @relation(fields: [userId], references: [id])
  service ImeiService @relation(fields: [serviceId], references: [id])

  @@index([userId, status])
  @@index([status, createdAt])
}

enum ImeiOrderStatus {
  PENDING        // Baru dibuat, belum dikirim ke Dhru
  SUBMITTED      // Sudah dikirim ke Dhru, menunggu proses
  IN_PROCESS     // Sedang diproses di supplier
  SUCCESS        // Berhasil, result tersedia
  REJECTED       // Ditolak oleh supplier
  CANCELLED      // Dibatalkan admin/system
  REFUNDED       // Sudah di-refund ke wallet
}
```

### 5.6 Server Service & Order

```prisma
model ServerService {
  id          String        @id @default(cuid())
  apiId       String
  externalId  String        // Service ID di DhruFusion untuk server service
  title       String
  description String?       @db.Text
  buyPrice    Decimal       @db.Decimal(12, 2)
  sellPrice   Decimal       @db.Decimal(12, 0)
  deliveryTime String?
  status      ServiceStatus @default(ACTIVE)
  
  // Required fields
  requiresImei     Boolean @default(false)
  requiresModelNo  Boolean @default(false)
  requiresNetwork  Boolean @default(false)
  requiresSn       Boolean @default(false)
  requiresNote     Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  api    ImeiApi       @relation(fields: [apiId], references: [id])
  orders ServerOrder[]
}

model ServerOrder {
  id         String            @id @default(cuid())
  orderCode  String            @unique // "SRV-YYYYMMDD-XXXXXX"
  userId     String
  serviceId  String
  status     ServerOrderStatus @default(PENDING)
  price      Decimal           @db.Decimal(12, 0)

  // Input
  imei         String?
  modelNo      String?
  network      String?
  serialNumber String?
  note         String?   @db.Text
  fileUpload   String?   // URL file yang di-upload (jika diperlukan)

  // Response from Dhru
  externalOrderId String?
  resultCode      String?  @db.Text
  resultComments  String?  @db.Text
  resultFileUrl   String?  // URL file result (jika server service menghasilkan file)

  // Payment
  paymentMethod   String?
  paymentRef      String?

  // Timestamps
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  submittedAt DateTime?
  processedAt DateTime?
  completedAt DateTime?

  user    User          @relation(fields: [userId], references: [id])
  service ServerService @relation(fields: [serviceId], references: [id])

  @@index([userId, status])
  @@index([status, createdAt])
}

enum ServerOrderStatus {
  PENDING
  SUBMITTED
  IN_PROCESS
  SUCCESS
  REJECTED
  CANCELLED
  REFUNDED
}
```

### 5.7 Activity Log

```prisma
model ActivityLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String   // "order.created", "order.status_changed", "wallet.topup", dll
  entity    String?  // "ImeiOrder", "ServerOrder", "Wallet"
  entityId  String?
  metadata  Json     @default("{}")
  ipAddress String?
  createdAt DateTime @default(now())
}
```

### 5.8 CMS — Content Management System (Konten Dinamis)

```prisma
/// Pengaturan global website (theme, branding, meta)
model SiteSettings {
  id        String   @id @default("singleton") // Hanya 1 record
  siteName  String   @default("IMEI Service")
  siteTagline String @default("Layanan IMEI & Server terpercaya")
  logoUrl   String?
  faviconUrl String?
  themeMode String   @default("system") // "light" | "dark" | "system"
  primaryColor String @default("#10b981") // HEX color
  accentColor  String @default("#06b6d4")
  
  // SEO
  metaTitle       String?
  metaDescription String? @db.Text
  metaKeywords    String?
  ogImage         String? // Open Graph image URL

  // Social media links
  socialInstagram String?
  socialTiktok    String?
  socialWhatsapp  String?
  socialTelegram  String?
  socialFacebook  String?
  socialYoutube   String?

  // Footer
  footerText      String? @db.Text
  copyrightText   String?

  // Feature toggles
  enableDarkMode    Boolean @default(true)
  enableRegistration Boolean @default(true)
  enableDirectPayment Boolean @default(false)
  maintenanceMode    Boolean @default(false)
  maintenanceMessage String? @db.Text
  
  updatedAt DateTime @updatedAt
}

/// Section/blok konten yang bisa disusun untuk landing page
model PageSection {
  id         String  @id @default(cuid())
  pageSlug   String  @default("home") // "home", "about", "faq", dll
  sectionType String // Tipe blok: "hero", "features", "pricing", "testimonials", "cta", "banner", "faq", "custom_html", "service_catalog"
  title      String?
  subtitle   String? @db.Text
  content    Json    @default("{}") // Konten fleksibel per tipe section
  settings   Json    @default("{}") // Visual settings (bg color, padding, alignment, dll)
  isVisible  Boolean @default(true)
  sortOrder  Int     @default(0) // Urutan tampil di halaman
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([pageSlug, isVisible, sortOrder])
}

/// Banner / slider yang bisa ditampilkan di berbagai posisi
model Banner {
  id          String   @id @default(cuid())
  title       String
  subtitle    String?
  imageUrl    String   // URL gambar banner
  linkUrl     String?  // Redirect URL saat diklik
  position    String   @default("home_top") // "home_top", "home_middle", "sidebar", "popup", "service_page"
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  startDate   DateTime? // Jadwal tayang (nullable = selalu tampil)
  endDate     DateTime? // Jadwal berakhir
  clickCount  Int      @default(0) // Tracking klik
  viewCount   Int      @default(0) // Tracking view
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([position, isActive, sortOrder])
  @@index([startDate, endDate])
}

/// Running text / ads ticker
model RunningAd {
  id        String   @id @default(cuid())
  text      String   // Teks yang berjalan
  linkUrl   String?  // Optional link
  bgColor   String?  // Background color override
  textColor String?  // Text color override
  icon      String?  // Emoji atau icon name
  isActive  Boolean  @default(true)
  sortOrder Int      @default(0)
  startDate DateTime?
  endDate   DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([isActive, sortOrder])
}

/// Menu navigasi yang bisa diatur urutannya
model NavigationMenu {
  id         String  @id @default(cuid())
  location   String  // "header", "footer", "sidebar", "mobile_bottom"
  label      String  // Teks menu
  href       String  // URL tujuan
  icon       String? // Icon name (opsional)
  isExternal Boolean @default(false) // Buka di tab baru?
  isVisible  Boolean @default(true)
  sortOrder  Int     @default(0)
  parentId   String? // Untuk sub-menu (nullable = top-level)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([location, isVisible, sortOrder])
}

/// FAQ items (bisa dikelola admin)
model FaqItem {
  id        String   @id @default(cuid())
  category  String   @default("general") // "general", "order", "payment", "technical"
  question  String
  answer    String   @db.Text
  isVisible Boolean  @default(true)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([category, isVisible, sortOrder])
}

/// Testimonial / review dari customer (admin-managed)
model Testimonial {
  id        String   @id @default(cuid())
  name      String   // Nama customer
  avatar    String?  // URL foto
  role      String?  // "Reseller", "Teknisi", dll
  rating    Int      @default(5) // 1-5
  content   String   @db.Text
  isVisible Boolean  @default(true)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

/// Media library — upload gambar/file untuk dipakai di mana saja
model MediaFile {
  id         String   @id @default(cuid())
  filename   String
  url        String   // Final public URL (R2/S3)
  mimeType   String
  size       Int      // bytes
  altText    String?
  uploadedBy String?  // userId admin
  folder     String   @default("general") // "banners", "logos", "content", "general"
  createdAt  DateTime @default(now())
}

/// Custom pages (admin bisa buat halaman bebas seperti "Tentang Kami", "Syarat & Ketentuan")
model CustomPage {
  id          String   @id @default(cuid())
  slug        String   @unique // URL path, misal "tentang-kami"
  title       String
  content     String   @db.Text // Rich HTML / Markdown
  metaTitle   String?
  metaDescription String?
  isPublished Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### 5.8.1 Section Types yang Didukung

Setiap `PageSection` memiliki `sectionType` yang menentukan renderer-nya:

| sectionType | Deskripsi | Content JSON Structure |
|-------------|-----------|----------------------|
| `hero` | Hero section utama | `{ heading, subheading, ctaText, ctaLink, bgImage, bgVideo }` |
| `features` | Grid fitur/keunggulan | `{ items: [{ icon, title, description }] }` |
| `service_catalog` | Tampilan katalog service | `{ layout: "grid" \| "list", showPricing: true }` |
| `pricing` | Tabel harga / paket | `{ items: [{ title, price, features[], popular }] }` |
| `testimonials` | Slider testimonial | `{ source: "database" \| "custom", items?: [...] }` |
| `faq` | Accordion FAQ | `{ source: "database" \| "custom", category?: "..." }` |
| `banner_slider` | Carousel banner | `{ position: "home_top", autoplay: true, interval: 5000 }` |
| `cta` | Call-to-action section | `{ heading, description, buttonText, buttonLink, bgColor }` |
| `stats` | Angka statistik | `{ items: [{ label, value, suffix }] }` |
| `partners` | Logo brand partner | `{ items: [{ name, logoUrl }], marquee: true }` |
| `custom_html` | HTML/Markdown bebas | `{ html: "<div>...</div>" }` |
| `spacer` | Pembatas/jarak | `{ height: "4rem", bgColor?: "#..." }` |
| `running_ads` | Running text ticker | `{ source: "database" }` |

#### 5.8.2 Settings JSON per Section

Setiap section juga punya `settings` JSON untuk kontrol visual:

```json
{
  "backgroundColor": "#ffffff",
  "backgroundGradient": "from-white to-primary-50",
  "padding": "py-16 lg:py-24",
  "maxWidth": "max-w-7xl",
  "textAlign": "center",
  "animation": "fade-up",
  "darkOverride": {
    "backgroundColor": "#0f172a"
  }
}
```

---

## 6. DhruFusion API — Referensi Lengkap

### 6.1 Konfigurasi yang Diperlukan

| Parameter | Contoh | Keterangan |
|-----------|--------|------------|
| `host` | `https://supplier.dfrn.me` | Base URL dari panel DhruFusion supplier |
| `username` | `reseller01` | Username akun reseller di panel Dhru |
| `apiKey` | `abc123xyz789...` | API Access Key (dari menu API Settings di panel Dhru) |

### 6.2 Struktur Request (Semua Endpoint)

Semua request ke DhruFusion menggunakan **HTTP POST** dengan body **form-urlencoded** atau **JSON**.

**Base URL Pattern:**
```
POST {host}/api/index.php
```

**Common Parameters (wajib di setiap request):**
```
username={username}
apiaccesskey={apiKey}
action={action_name}
```

### 6.3 Endpoint: Cek Saldo Akun

**Action:** `accountinfo`

**Request:**
```http
POST {host}/api/index.php
Content-Type: application/x-www-form-urlencoded

username=reseller01&apiaccesskey=abc123xyz&action=accountinfo
```

**Response (Success):**
```json
{
  "STATUS": "SUCCESS",
  "BALANCE": "125.50",
  "CURRENCY": "USD",
  "USERNAME": "reseller01",
  "EMAIL": "reseller@example.com"
}
```

**Kapan Dipakai:** Admin → "Test Connection" & periodic balance sync.

---

### 6.4 Endpoint: Daftar Service IMEI

**Action:** `getservices`

**Request:**
```http
POST {host}/api/index.php

username=reseller01&apiaccesskey=abc123xyz&action=getservices
```

**Response (Success):**
```json
{
  "STATUS": "SUCCESS",
  "LIST": [
    {
      "SERVICE_ID": "101",
      "SERVICE_NAME": "Samsung Galaxy S24 T-Mobile USA",
      "GROUP_ID": "5",
      "GROUP_NAME": "Samsung Network Unlock",
      "CREDIT": "3.50",
      "TIME": "1-48 Hours",
      "INFO": "IMEI only. Clean only.",
      "REQUIRE_FIELDS": "IMEI"
    },
    {
      "SERVICE_ID": "205",
      "SERVICE_NAME": "iPhone iCloud Clean Removal",
      "GROUP_ID": "8",
      "GROUP_NAME": "Apple iCloud",
      "CREDIT": "25.00",
      "TIME": "3-7 Days",
      "INFO": "IMEI + SN required. Clean status only.",
      "REQUIRE_FIELDS": "IMEI,SN"
    }
  ]
}
```

**Kapan Dipakai:** Admin → "Sync Services" untuk import service dari supplier ke database lokal.

---

### 6.5 Endpoint: Place Order IMEI

**Action:** `placeorder`

**Request:**
```http
POST {host}/api/index.php
Content-Type: application/x-www-form-urlencoded

username=reseller01
&apiaccesskey=abc123xyz
&action=placeorder
&service_id=101
&imei=353456789012345
&network=T-Mobile
&model=SM-S928B
&provider=
&pin=
&kbh=
&mep=
&prd=
&sn=
&ref=IMEI-20260526-A1B2C3
```

**Parameters:**

| Parameter | Required | Keterangan |
|-----------|----------|------------|
| `service_id` | Ya | ID service di panel Dhru (from `getservices`) |
| `imei` | Tergantung service | Nomor IMEI (15 digit) |
| `network` | Tergantung service | Nama jaringan operator |
| `model` | Tergantung service | Model device |
| `provider` | Tergantung service | Nama provider |
| `pin` | Tergantung service | PIN code |
| `kbh` | Tergantung service | KBH code |
| `mep` | Tergantung service | MEP code |
| `prd` | Tergantung service | PRD code |
| `sn` | Tergantung service | Serial Number |
| `ref` | Opsional | Reference ID dari sistem kita (untuk tracking) |

**Response (Success):**
```json
{
  "STATUS": "SUCCESS",
  "ID": "987654",
  "MESSAGE": "Order placed successfully"
}
```

**Response (Error):**
```json
{
  "STATUS": "ERROR",
  "MESSAGE": "Insufficient credit"
}
```

**Field penting:**
- `ID` → Simpan sebagai `externalOrderId` di database kita. Ini yang dipakai untuk cek status.

---

### 6.6 Endpoint: Cek Status Order IMEI

**Action:** `getstatus`

**Request:**
```http
POST {host}/api/index.php

username=reseller01&apiaccesskey=abc123xyz&action=getstatus&id=987654
```

| Parameter | Required | Keterangan |
|-----------|----------|------------|
| `id` | Ya | Order ID yang didapat dari `placeorder` response |

**Response (In Process):**
```json
{
  "STATUS": "SUCCESS",
  "ID": "987654",
  "ORDER_STATUS": "In Process",
  "CODE": "",
  "COMMENTS": "Processing, please wait.",
  "TIMESTAMP": "2026-05-26 10:30:00"
}
```

**Response (Completed — Success):**
```json
{
  "STATUS": "SUCCESS",
  "ID": "987654",
  "ORDER_STATUS": "Completed",
  "CODE": "12345678",
  "COMMENTS": "Network Unlock Code: 12345678\nFreeze Code: 87654321",
  "TIMESTAMP": "2026-05-26 14:22:00"
}
```

**Response (Rejected):**
```json
{
  "STATUS": "SUCCESS",
  "ID": "987654",
  "ORDER_STATUS": "Rejected",
  "CODE": "",
  "COMMENTS": "IMEI not found in database. Not supported.",
  "TIMESTAMP": "2026-05-26 11:05:00"
}
```

**ORDER_STATUS possible values:**
| Value | Mapping ke sistem kita |
|-------|----------------------|
| `Pending` | `SUBMITTED` |
| `In Process` | `IN_PROCESS` |
| `Completed` | `SUCCESS` |
| `Rejected` | `REJECTED` |
| `Cancelled` | `CANCELLED` |

---

### 6.7 Endpoint: Place Server Order

**Action:** `placeserverorder`

**Request:**
```http
POST {host}/api/index.php

username=reseller01
&apiaccesskey=abc123xyz
&action=placeserverorder
&service_id=301
&imei=353456789012345
&modelno=SM-A546B
&network=
&sn=
&ref=SRV-20260526-X1Y2Z3
```

| Parameter | Required | Keterangan |
|-----------|----------|------------|
| `service_id` | Ya | Server service ID dari Dhru |
| `imei` | Tergantung | IMEI jika diperlukan |
| `modelno` | Tergantung | Model number device |
| `network` | Tergantung | Network name |
| `sn` | Tergantung | Serial number |
| `ref` | Opsional | Reference ID internal |

**Response (Success):**
```json
{
  "STATUS": "SUCCESS",
  "ID": "112233",
  "MESSAGE": "Server order placed"
}
```

---

### 6.8 Endpoint: Cek Status Server Order

**Action:** `getserverstatus`

**Request:**
```http
POST {host}/api/index.php

username=reseller01&apiaccesskey=abc123xyz&action=getserverstatus&id=112233
```

**Response:**
```json
{
  "STATUS": "SUCCESS",
  "ID": "112233",
  "ORDER_STATUS": "Completed",
  "CODE": "Download link: https://...",
  "COMMENTS": "Firmware file ready for download.",
  "FILE_URL": "https://supplier.dfrn.me/files/result_112233.zip",
  "TIMESTAMP": "2026-05-26 16:00:00"
}
```

---

### 6.9 Endpoint: Daftar Server Services

**Action:** `getserverservices`

**Request:**
```http
POST {host}/api/index.php

username=reseller01&apiaccesskey=abc123xyz&action=getserverservices
```

**Response:**
```json
{
  "STATUS": "SUCCESS",
  "LIST": [
    {
      "SERVICE_ID": "301",
      "SERVICE_NAME": "Samsung FRP Bypass (Remote)",
      "CREDIT": "5.00",
      "TIME": "10-30 Minutes",
      "INFO": "IMEI + Model required"
    }
  ]
}
```

---

## 7. Alur Order End-to-End

### 7.1 Flow: User Place IMEI Order

```
┌──────────┐     ┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│   USER   │     │   BACKEND   │     │   DATABASE   │     │   DHRUFUSION  │
└────┬─────┘     └──────┬──────┘     └──────┬───────┘     └───────┬───────┘
     │                   │                   │                     │
     │ 1. Submit order   │                   │                     │
     │   (service_id,    │                   │                     │
     │    imei, fields)  │                   │                     │
     │──────────────────►│                   │                     │
     │                   │ 2. Validate input │                     │
     │                   │    (Zod schema)   │                     │
     │                   │                   │                     │
     │                   │ 3. Check wallet   │                     │
     │                   │    balance >= price│                     │
     │                   │──────────────────►│                     │
     │                   │                   │                     │
     │                   │ 4. Debit wallet   │                     │
     │                   │    (PAYMENT)      │                     │
     │                   │──────────────────►│                     │
     │                   │                   │                     │
     │                   │ 5. Create order   │                     │
     │                   │    status=PENDING │                     │
     │                   │──────────────────►│                     │
     │                   │                   │                     │
     │                   │ 6. POST placeorder│                     │
     │                   │───────────────────────────────────────►│
     │                   │                   │                     │
     │                   │ 7. Response:      │                     │
     │                   │    {ID: "987654"} │                     │
     │                   │◄───────────────────────────────────────│
     │                   │                   │                     │
     │                   │ 8. Update order:  │                     │
     │                   │    externalOrderId│                     │
     │                   │    status=SUBMITTED│                    │
     │                   │──────────────────►│                     │
     │                   │                   │                     │
     │ 9. Response:      │                   │                     │
     │    order created  │                   │                     │
     │◄──────────────────│                   │                     │
     │                   │                   │                     │
```

### 7.2 Flow: Background Polling (Cron Job)

```
┌──────────────┐     ┌──────────────┐     ┌───────────────┐
│  SCHEDULER   │     │   DATABASE   │     │   DHRUFUSION  │
└──────┬───────┘     └──────┬───────┘     └───────┬───────┘
       │                    │                     │
       │ 1. Query orders    │                     │
       │    WHERE status    │                     │
       │    IN (SUBMITTED,  │                     │
       │    IN_PROCESS)     │                     │
       │───────────────────►│                     │
       │                    │                     │
       │ 2. Result:         │                     │
       │    [order1, order2]│                     │
       │◄───────────────────│                     │
       │                    │                     │
       │ 3. For each order: │                     │
       │    POST getstatus  │                     │
       │    id={externalId} │                     │
       │───────────────────────────────────────►│
       │                    │                     │
       │ 4. Response:       │                     │
       │    ORDER_STATUS,   │                     │
       │    CODE, COMMENTS  │                     │
       │◄───────────────────────────────────────│
       │                    │                     │
       │ 5. IF status       │                     │
       │    changed:        │                     │
       │    Update order    │                     │
       │    + notify user   │                     │
       │───────────────────►│                     │
       │                    │                     │
       │ 6. IF status =     │                     │
       │    REJECTED:       │                     │
       │    Refund wallet   │                     │
       │───────────────────►│                     │
       │                    │                     │
```

### 7.3 Flow: Admin Sync Services

```
Admin klik "Sync Services"
    ↓
Backend POST getservices ke Dhru
    ↓
Response: daftar semua service dengan ID, nama, grup, harga, required fields
    ↓
Tampilkan ke admin dalam tabel
    ↓
Admin pilih service mana yang mau di-import
    ↓
Admin set harga jual (IDR) per service
    ↓
Simpan ke database (ImeiService / ServerService)
    ↓
Service muncul di katalog publik
```

---

## 8. API Endpoints Internal (Backend)

### 8.1 Public API

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| GET | `/api/services/imei` | Daftar IMEI services (publik, grouped) |
| GET | `/api/services/imei/[groupId]` | Services per grup |
| GET | `/api/services/server` | Daftar server services |

### 8.2 User API (Authenticated)

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| POST | `/api/user/orders/imei` | Place IMEI order |
| POST | `/api/user/orders/server` | Place server order |
| GET | `/api/user/orders` | Riwayat order user |
| GET | `/api/user/orders/[id]` | Detail order |
| GET | `/api/user/wallet` | Saldo wallet |
| GET | `/api/user/wallet/history` | Riwayat transaksi wallet |
| POST | `/api/user/wallet/topup` | Request topup |

### 8.3 Admin API

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| GET/POST/PUT/DELETE | `/api/admin/providers` | CRUD API provider |
| POST | `/api/admin/providers/[id]/test` | Test koneksi ke Dhru |
| POST | `/api/admin/providers/[id]/sync-services` | Sync daftar service dari Dhru |
| POST | `/api/admin/providers/[id]/sync-balance` | Sync saldo supplier |
| GET/POST/PUT/DELETE | `/api/admin/services/imei` | CRUD IMEI services |
| GET/POST/PUT/DELETE | `/api/admin/services/imei-groups` | CRUD service groups |
| GET/POST/PUT/DELETE | `/api/admin/services/server` | CRUD server services |
| GET | `/api/admin/orders` | Semua orders (filter, pagination) |
| GET | `/api/admin/orders/[id]` | Detail order (admin view) |
| POST | `/api/admin/orders/[id]/cancel` | Cancel order + refund |
| POST | `/api/admin/orders/[id]/retry` | Retry submit ke Dhru |
| GET | `/api/admin/wallet/topup-requests` | Daftar request topup |
| POST | `/api/admin/wallet/topup-requests/[id]/approve` | Approve topup |
| POST | `/api/admin/wallet/topup-requests/[id]/reject` | Reject topup |
| GET | `/api/admin/dashboard` | Statistik overview |
| GET | `/api/admin/users` | Daftar user |
| GET | `/api/admin/logs` | Activity logs |

#### Admin CMS API

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| GET/PUT | `/api/admin/cms/settings` | Get/update site settings (tema, logo, SEO, toggles) |
| GET/POST | `/api/admin/cms/sections` | List/create page sections |
| PUT | `/api/admin/cms/sections/[id]` | Update section content/settings |
| DELETE | `/api/admin/cms/sections/[id]` | Hapus section |
| PUT | `/api/admin/cms/sections/reorder` | Reorder sections (batch update sortOrder) |
| GET/POST | `/api/admin/cms/banners` | List/create banners |
| PUT/DELETE | `/api/admin/cms/banners/[id]` | Update/hapus banner |
| GET/POST | `/api/admin/cms/running-ads` | List/create running ads |
| PUT/DELETE | `/api/admin/cms/running-ads/[id]` | Update/hapus running ad |
| GET/POST | `/api/admin/cms/menus` | List/create navigation menus |
| PUT/DELETE | `/api/admin/cms/menus/[id]` | Update/hapus menu item |
| PUT | `/api/admin/cms/menus/reorder` | Reorder menu items |
| GET/POST | `/api/admin/cms/faq` | List/create FAQ items |
| PUT/DELETE | `/api/admin/cms/faq/[id]` | Update/hapus FAQ |
| GET/POST | `/api/admin/cms/testimonials` | List/create testimonials |
| PUT/DELETE | `/api/admin/cms/testimonials/[id]` | Update/hapus testimonial |
| GET/POST | `/api/admin/cms/pages` | List/create custom pages |
| PUT/DELETE | `/api/admin/cms/pages/[id]` | Update/hapus custom page |
| POST | `/api/admin/cms/media/upload` | Upload file ke storage |
| GET | `/api/admin/cms/media` | Media library (list files) |
| DELETE | `/api/admin/cms/media/[id]` | Hapus media file |

#### Public CMS API (consumed by frontend)

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| GET | `/api/cms/settings` | Site settings publik (tanpa secrets) |
| GET | `/api/cms/sections?page=home` | Sections untuk halaman tertentu |
| GET | `/api/cms/banners?position=home_top` | Active banners per posisi |
| GET | `/api/cms/running-ads` | Active running ads |
| GET | `/api/cms/menus?location=header` | Menu items per lokasi |
| GET | `/api/cms/faq?category=general` | FAQ items per kategori |
| GET | `/api/cms/testimonials` | Testimonials aktif |
| GET | `/api/cms/pages/[slug]` | Custom page by slug |

### 8.4 Cron/Internal API

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| POST | `/api/cron/poll-imei-orders` | Trigger polling IMEI orders |
| POST | `/api/cron/poll-server-orders` | Trigger polling server orders |

---

## 9. Background Jobs — Detail Implementasi

### 9.1 IMEI Order Poller

**File:** `src/lib/imei-order-worker.ts`

**Interval:** Setiap 60 detik

**Logic:**
```
1. Query: SELECT * FROM ImeiOrder WHERE status IN ('SUBMITTED', 'IN_PROCESS') AND updatedAt < now() - 30s
2. Untuk setiap order:
   a. POST getstatus ke DhruFusion dengan externalOrderId
   b. Parse response ORDER_STATUS
   c. Map status Dhru → status internal:
      - "Pending"     → SUBMITTED (no change)
      - "In Process"  → IN_PROCESS
      - "Completed"   → SUCCESS
      - "Rejected"    → REJECTED
      - "Cancelled"   → CANCELLED
   d. Jika status berubah:
      - Update order di DB
      - Jika SUCCESS: simpan CODE & COMMENTS ke resultCode & resultComments
      - Jika REJECTED: auto-refund ke wallet user
      - Log activity
      - Kirim notifikasi ke user
3. Rate limit: max 10 requests per poll cycle (batch)
4. Error handling: jika Dhru API error, skip order dan retry next cycle
5. Retry limit: setelah 100 poll tanpa perubahan → tandai STALE
```

### 9.2 Server Order Poller

**File:** `src/lib/server-order-worker.ts`

**Interval:** Setiap 60 detik

**Logic:** Sama dengan IMEI poller, tetapi:
- Endpoint: `getserverstatus`
- Tambahan: simpan `FILE_URL` ke `resultFileUrl` jika ada

### 9.3 Stale Order Checker

**File:** `src/lib/stale-order-checker.ts`

**Interval:** Setiap 5 menit

**Logic:**
```
1. Query orders yang status = SUBMITTED/IN_PROCESS AND createdAt < now() - 72h
2. Tandai sebagai STALE (atau notify admin)
3. Admin bisa manual retry atau cancel+refund
```

### 9.4 Balance Sync

**File:** `src/lib/balance-sync-worker.ts`

**Interval:** Setiap 15 menit

**Logic:**
```
1. Untuk setiap API provider yang ACTIVE:
   a. POST accountinfo
   b. Update balance di ImeiApi record
   c. Jika balance < threshold → alert admin
```

---

## 10. Halaman & Navigasi (Sitemap)

### 10.1 Public

| Route | Deskripsi |
|-------|-----------|
| `/` | Landing page (dinamis — dari PageSection yang di-set admin) |
| `/services` | Katalog semua layanan |
| `/services/imei` | Kategori IMEI services |
| `/services/imei/[groupId]` | Daftar service per grup |
| `/services/server` | Kategori server services |
| `/login` | Login |
| `/register` | Register |
| `/faq` | FAQ page (konten dari database) |
| `/[slug]` | Custom pages (About, T&C, Privacy, dll — konten dari admin) |

### 10.2 User Dashboard

| Route | Deskripsi |
|-------|-----------|
| `/user/dashboard` | Overview order & saldo |
| `/user/orders` | Riwayat order |
| `/user/orders/[id]` | Detail order + result |
| `/user/orders/new/imei/[serviceId]` | Form order IMEI |
| `/user/orders/new/server/[serviceId]` | Form order Server |
| `/user/wallet` | Saldo & topup |
| `/user/settings` | Profil & keamanan |

### 10.3 Admin Dashboard

| Route | Deskripsi |
|-------|-----------|
| `/admin/dashboard` | Statistik |
| `/admin/providers` | Kelola API provider |
| `/admin/providers/[id]` | Detail & test provider |
| `/admin/services/imei` | Kelola IMEI services |
| `/admin/services/server` | Kelola server services |
| `/admin/orders` | Monitor semua orders |
| `/admin/orders/[id]` | Detail order + action |
| `/admin/wallet` | Topup requests & user wallets |
| `/admin/users` | User management |
| `/admin/logs` | Activity log |
| `/admin/settings` | Platform settings |
| `/admin/cms` | CMS Dashboard (overview konten) |
| `/admin/cms/site-settings` | Pengaturan global (logo, tema, warna, SEO, social, toggles) |
| `/admin/cms/landing-builder` | Page builder — drag & drop sections untuk landing |
| `/admin/cms/banners` | Kelola banner/slider (upload, jadwal, posisi, statistik) |
| `/admin/cms/running-ads` | Kelola running text/ticker |
| `/admin/cms/menus` | Atur navigasi (header, footer, mobile) — drag & drop reorder |
| `/admin/cms/faq` | Kelola FAQ (kategori, urutan) |
| `/admin/cms/testimonials` | Kelola testimonial (nama, foto, rating, komentar) |
| `/admin/cms/pages` | Custom pages (About, T&C, dll) — rich text editor |
| `/admin/cms/pages/[id]` | Edit custom page |
| `/admin/cms/media` | Media library (upload, folder, browse, delete) |

---

## 11. Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/imei_services"

# Auth
AUTH_SECRET="random-secret-key-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# DhruFusion API (default provider — bisa multiple via DB)
DHRU_DEFAULT_HOST="https://supplier.dfrn.me"
DHRU_DEFAULT_USERNAME="reseller01"
DHRU_DEFAULT_API_KEY="abc123xyz789..."

# Background Jobs
POLL_INTERVAL_IMEI_MS=60000         # 60 detik
POLL_INTERVAL_SERVER_MS=60000       # 60 detik
POLL_INTERVAL_BALANCE_MS=900000     # 15 menit
STALE_ORDER_THRESHOLD_HOURS=72      # 72 jam
POLL_BATCH_SIZE=10                  # Max orders per poll cycle

# Payment Gateway (opsional, untuk direct payment)
PAYMENT_GATEWAY_KEY="pk_..."
PAYMENT_GATEWAY_SECRET="sk_..."
PAYMENT_GATEWAY_WEBHOOK_SECRET="whsec_..."

# Email Notifications (opsional)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="noreply@example.com"
SMTP_PASS="password"
```

---

## 12. Keamanan & Non-Functional Requirements

### 12.1 Security
- Password hashing: bcrypt (rounds ≥ 12)
- API key tersimpan encrypted di database (atau env variable)
- Rate limiting pada endpoint order creation (max 10/menit per user)
- RBAC enforcement di middleware + API handler level
- Activity logging untuk setiap action sensitif
- Input validation (Zod) di semua mutasi API
- CSRF protection (NextAuth built-in)
- Helmet headers (X-Frame-Options, CSP, dll)

### 12.2 Reliability
- Idempotent order submission (cek duplikasi IMEI + service dalam 5 menit)
- Retry policy: poll gagal → skip, retry next cycle (no exponential backoff dibutuhkan untuk polling)
- Auto-refund pada order REJECTED/CANCELLED
- Database transactions untuk operasi wallet (debit + create order atomic)

### 12.3 Performance
- Query read-heavy (katalog) di-cache 60 detik
- Polling batch max 10 orders per cycle (menghindari rate limit dari supplier)
- Pagination di semua list endpoint
- Index database pada kolom yang sering di-query (status, userId, createdAt)

### 12.4 Observability
- Activity log lengkap (siapa, kapan, apa, dari IP berapa)
- Error logging di background jobs
- Saldo supplier dipantau → alert jika rendah
- Dashboard admin menampilkan: success rate, average delivery time, pending count

---

## 13. Implementation Tasks (Fase)

### Fase 1 — Foundation (1-2 hari)
- [ ] Setup project (Next.js + Prisma + PostgreSQL + Tailwind)
- [ ] Definisi Prisma schema lengkap + migration
- [ ] Auth (login, register, RBAC middleware)
- [ ] Layout: public, user dashboard, admin dashboard
- [ ] Environment variables setup

### Fase 2 — Admin Panel (2-3 hari)
- [ ] CRUD API Provider (host, username, apiKey, test connection)
- [ ] Sync services dari Dhru (getservices, getserverservices)
- [ ] CRUD IMEI Service Groups
- [ ] CRUD IMEI Services (dengan pricing, required fields)
- [ ] CRUD Server Services
- [ ] User management (list, activate/deactivate)
- [ ] Activity log viewer

### Fase 3 — Wallet (1 hari)
- [ ] Wallet creation saat user register
- [ ] Topup request flow (user request → admin approve)
- [ ] Wallet balance display + history
- [ ] Debit/credit helper functions (atomic transactions)
- [ ] Refund mechanism

### Fase 4 — Order Flow (2-3 hari)
- [ ] Katalog publik (grouped, searchable)
- [ ] Form order IMEI (dynamic required fields berdasarkan service)
- [ ] Form order Server
- [ ] Checkout: pilih payment method (wallet / direct)
- [ ] Place order → submit ke DhruFusion API
- [ ] Order detail page (status, result, timestamps)
- [ ] Riwayat order (filter, pagination, search)

### Fase 5 — Background Jobs (1-2 hari)
- [ ] IMEI order poller (getstatus)
- [ ] Server order poller (getserverstatus)
- [ ] Status mapping & auto-update
- [ ] Auto-refund pada REJECTED
- [ ] Balance sync worker
- [ ] Stale order detection
- [ ] Notification on status change

### Fase 6 — Admin Monitoring (1 hari)
- [ ] Dashboard: total orders, success rate, revenue, pending count
- [ ] Order management: view all, filter, cancel, retry
- [ ] Supplier balance monitoring
- [ ] Topup approval panel

### Fase 7 — CMS & Content Management (3-4 hari)
- [ ] Model CMS (SiteSettings, PageSection, Banner, RunningAd, NavigationMenu, FaqItem, Testimonial, MediaFile, CustomPage)
- [ ] API site settings (GET/PUT) + frontend SSR consumption
- [ ] Page builder: CRUD sections + drag-and-drop reorder (sortOrder)
- [ ] Section renderer: komponen React per sectionType (hero, features, cta, banner_slider, faq, dll)
- [ ] Banner management (upload, jadwal, posisi, click tracking)
- [ ] Running ads management
- [ ] Navigation menu editor (header, footer, mobile) + reorder
- [ ] FAQ editor per kategori
- [ ] Testimonial editor
- [ ] Media library (upload ke R2/S3, browse, delete, folder)
- [ ] Custom page editor (rich text / Markdown) + public route `/[slug]`
- [ ] Theme switcher (dark/light/system) + warna dinamis via CSS variables
- [ ] SEO settings (meta tags di `<head>` dari SiteSettings)
- [ ] Feature toggles (registrasi, direct payment, maintenance mode)
- [ ] Preview mode (admin bisa lihat perubahan sebelum publish)
- [ ] Maintenance mode page (block publik, admin tetap bisa akses)

### Fase 8 — Polish & Deploy (1-2 hari)
- [ ] Landing page
- [ ] Responsive design
- [ ] Error handling & edge cases
- [ ] API response contract validation
- [ ] Security hardening (rate limit, headers)
- [ ] Production deployment

---

## 14. DhruFusion Client — Implementasi Kode

### 14.1 Client Class

```typescript
// src/lib/dhru-client.ts

type DhruConfig = {
  host: string
  username: string
  apiKey: string
}

type DhruResponse = {
  STATUS: 'SUCCESS' | 'ERROR'
  [key: string]: unknown
}

export class DhruClient {
  constructor(private config: DhruConfig) {}

  private async call(action: string, params: Record<string, string> = {}): Promise<DhruResponse> {
    const body = new URLSearchParams({
      username: this.config.username,
      apiaccesskey: this.config.apiKey,
      action,
      ...params,
    })

    const res = await fetch(`${this.config.host}/api/index.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    if (!res.ok) throw new Error(`DhruFusion HTTP ${res.status}`)
    return res.json()
  }

  async getAccountInfo() {
    return this.call('accountinfo')
  }

  async getServices() {
    return this.call('getservices')
  }

  async getServerServices() {
    return this.call('getserverservices')
  }

  async placeImeiOrder(params: {
    serviceId: string
    imei: string
    network?: string
    model?: string
    provider?: string
    pin?: string
    kbh?: string
    mep?: string
    prd?: string
    sn?: string
    ref?: string
  }) {
    return this.call('placeorder', {
      service_id: params.serviceId,
      imei: params.imei,
      ...(params.network && { network: params.network }),
      ...(params.model && { model: params.model }),
      ...(params.provider && { provider: params.provider }),
      ...(params.pin && { pin: params.pin }),
      ...(params.kbh && { kbh: params.kbh }),
      ...(params.mep && { mep: params.mep }),
      ...(params.prd && { prd: params.prd }),
      ...(params.sn && { sn: params.sn }),
      ...(params.ref && { ref: params.ref }),
    })
  }

  async getImeiOrderStatus(externalOrderId: string) {
    return this.call('getstatus', { id: externalOrderId })
  }

  async placeServerOrder(params: {
    serviceId: string
    imei?: string
    modelNo?: string
    network?: string
    sn?: string
    ref?: string
  }) {
    return this.call('placeserverorder', {
      service_id: params.serviceId,
      ...(params.imei && { imei: params.imei }),
      ...(params.modelNo && { modelno: params.modelNo }),
      ...(params.network && { network: params.network }),
      ...(params.sn && { sn: params.sn }),
      ...(params.ref && { ref: params.ref }),
    })
  }

  async getServerOrderStatus(externalOrderId: string) {
    return this.call('getserverstatus', { id: externalOrderId })
  }
}
```

### 14.2 Helper: Create Client dari Database

```typescript
// src/lib/dhru-factory.ts

import { prisma } from '@/lib/db'
import { DhruClient } from './dhru-client'

export async function createDhruClient(apiId: string): Promise<DhruClient> {
  const api = await prisma.imeiApi.findUniqueOrThrow({ where: { id: apiId } })
  
  if (api.status !== 'ACTIVE') {
    throw new Error(`API provider ${api.title} is inactive`)
  }

  return new DhruClient({
    host: api.host,
    username: api.username,
    apiKey: api.apiKey,
  })
}
```

---

## 15. Kriteria Sukses

1. ✅ Admin bisa tambah API provider, test koneksi, dan sync service dari Dhru.
2. ✅ Katalog layanan tampil di publik terkelompok dengan harga.
3. ✅ User bisa register, login, topup wallet, dan place order.
4. ✅ Order otomatis terkirim ke DhruFusion dan ID disimpan.
5. ✅ Background poller memantau status dan update otomatis setiap 60 detik.
6. ✅ Saat order SUCCESS → result ditampilkan ke user.
7. ✅ Saat order REJECTED → saldo otomatis di-refund.
8. ✅ Admin bisa monitor semua order, cancel, retry, dan lihat statistik.
9. ✅ Semua transaksi wallet tercatat immutable di ledger.
10. ✅ Activity log mencatat setiap aksi sensitif.
11. ✅ Admin bisa mengatur tampilan website tanpa coding (landing page sections, urutan, visibility).
12. ✅ Admin bisa upload banner, atur jadwal tayang, dan lihat statistik klik.
13. ✅ Admin bisa mengatur navigasi menu (header, footer, mobile) dengan drag-and-drop.
14. ✅ Tema (dark/light/system) dan warna primer bisa diubah dari admin panel.
15. ✅ Custom page bisa dibuat admin dan diakses publik via slug URL.
16. ✅ Running ads/ticker berjalan di website sesuai konfigurasi admin.
17. ✅ Maintenance mode bisa diaktifkan instan tanpa deploy ulang.

---

## 16. Catatan Tambahan

### 16.1 Handling Error dari DhruFusion
- Jika response `STATUS = "ERROR"`:
  - `"Insufficient credit"` → Jangan create order, return error ke user, alert admin.
  - `"Invalid IMEI"` → Return validation error ke user.
  - `"Service not available"` → Matikan service di database, notify admin.
  - Network timeout → Retry 1x, jika gagal → simpan order sebagai PENDING (belum submit).

### 16.2 Idempotency
- Sebelum submit ke Dhru: cek apakah ada order dengan IMEI + serviceId yang sama dalam 5 menit terakhir → reject duplikat.
- Jika `placeorder` response timeout tetapi order mungkin sudah tercreate di Dhru → set status SUBMITTED dan let poller check.

### 16.3 Rate Limiting DhruFusion
- Beberapa panel Dhru membatasi request per menit.
- Batch polling max 10 order per cycle.
- Jeda 1 detik antar request saat batch polling.
- Sync services hanya bisa dilakukan 1x per 5 menit (admin-triggered).

---

**— End of PRD —**
