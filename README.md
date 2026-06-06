# CampaignHub (Promo Management)

Aplikasi web manajemen campaign marketplace untuk dua peran: **SPV (Supervisor)** dan **Admin**. SPV membuat skema campaign, submit, me-review eksekusi, dan menyetujui; Admin mengatur strategi, menghitung ekonomi campaign (biaya/margin/NPM), menyiapkan aset, dan mengeksekusi tugas di marketplace.

UI tampil dalam Bahasa Indonesia dengan gaya light-mode pastel, navigasi sidebar kiri, dan area konten modular per tab.

## Tech stack

- **TypeScript** (strict)
- **React 18 + Vite** untuk frontend
- **Vitest + fast-check** untuk unit & property-based testing
- Domain core murni (tanpa I/O) yang dipisah dari infrastruktur dan UI

## Menjalankan secara lokal

```bash
npm install        # pasang dependency
npm run dev        # jalankan dev server (Vite)
npm test           # jalankan seluruh test suite
npm run typecheck  # cek tipe TypeScript
npm run build      # build produksi ke dist/
npm run preview    # preview hasil build
```

Buka URL yang ditampilkan `npm run dev` (default `http://localhost:5173`). Gunakan selector **Peran** di kanan atas untuk berpindah antara Supervisor (SPV) dan Admin.

## Struktur proyek

```
src/
  domain/      # Logika murni: state machine, kalkulasi, validasi, akses,
               # notifikasi, koleksi, kalender, toko, master data, color registry
  infra/       # Persistence (repository), auth/session/lockout, scheduler, delivery
  api/         # Service API + middleware kontrol akses
  web/         # Frontend React: shell, sidebar, tema, 14 modul tab
```

### Modul (tab sidebar)

Dashboard · Kalender · Campaign · Workflow · Banner · Toko · IG Story · Host Live · Ads CPAS · Tugas Saya · Notifikasi · Laporan · Master Data · Pengaturan

### Alur campaign

`Buat Skema → Submit → Eksekusi → Review → Live`, dengan status `Menunggu / Proses / Review / Live / Selesai`. Transisi divalidasi state machine, audit dicatat tiap transisi, dan transisi terjadwal (go-live/selesai) dijalankan scheduler dengan SLA 60 detik.

## Testing

77 test mencakup 45 properti korektnes (property-based via fast-check, min. 100 iterasi per properti) untuk state machine, kalkulasi, kontrol akses, notifikasi, dan derivasi presentasi, plus test integrasi infrastruktur dan test komponen React.

```bash
npm test
```

## Catatan implementasi

- **Persistence** saat ini in-memory di balik interface repository yang stabil. Implementasi SQL dapat menggantikan tanpa mengubah pemanggil.
- **Frontend** memakai data demo ter-seed dan memanggil service langsung in-process (belum lewat HTTP). Layer HTTP API + database dapat ditambahkan sebagai langkah berikutnya.

## Deployment (Vercel)

Proyek ini adalah SPA Vite. Vercel mendeteksi framework Vite secara otomatis:

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Install command:** `npm install`

Tidak perlu konfigurasi rewrite khusus karena navigasi antar-modul dikelola state internal (single page).
