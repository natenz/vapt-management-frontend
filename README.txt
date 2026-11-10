================================================================================
                    VAPT MANAGEMENT FRONTEND
            Enterprise Feature-Sliced Design (FSD) Application
================================================================================

1. DESKRIPSI SINGKAT
--------------------------------------------------------------------------------
Aplikasi frontend web manajemen siklus hidup pengujian penetrasi (Vulnerability 
Assessment & Penetration Testing / VAPT). Dibangun menggunakan React 19, 
TypeScript (strict mode), Vite, Tailwind CSS v4, TanStack Query, dan token desain 
Vermilion (Figma "VAPT Command Center").

Aplikasi ini terhubung langsung ke backend REST API (vapt-management-backend).


2. ARSITEKTUR (FEATURE-SLICED DESIGN - FSD)
--------------------------------------------------------------------------------
Aplikasi mengadopsi hierarki Enterprise Feature-Sliced Design dengan isolasi 
ketat dan aturan arah impor satu arah (dari atas ke bawah):

   [Rank 60] app       -> Inisialisasi root, router, layout, dan global provider
   [Rank 50] pages     -> Halaman tipis (thin compositions) per rute
   [Rank 40] widgets   -> Komposisi blok UI mandiri (header, sidebar, panels)
   [Rank 30] features  -> Perilaku & interaksi pengguna (auth, dialog manajemen)
   [Rank 20] entities  -> Model data bisnis & API (catalog, finding, project, user)
   [Rank 10] shared    -> Primitif mandiri tanpa logika bisnis (ui, lib, api, config)

Tiga Aturan Guardrails (Ditegakkan via `npm run check:layers`):
1. Arah Impor: Layer hanya boleh mengimpor dari layer di bawahnya.
2. Isolasi Slice: Slice dalam layer yang sama dilarang saling mengimpor.
3. Public API Boundary: Akses ke slice lain wajib lewat root index (@/<layer>/<slice>).


3. PRASYARAT & PERSIAPAN
--------------------------------------------------------------------------------
- Node.js (v20 atau lebih baru)
- npm (v10 atau lebih baru)
- Service backend vapt-management-backend aktif (port default: 8088)

Langkah Instalasi:
1. Masuk ke direktori aplikasi:
   cd vapt-management-frontend

2. Instal dependensi:
   npm install

3. Konfigurasi Environment:
   Salin file .env.example menjadi .env:
   copy .env.example .env

   Pastikan konfigurasi API mengarah ke backend:
   VITE_API_BASE_URL=http://localhost:8088/api/v1


4. CARA MENJALANKAN APLIKASI
--------------------------------------------------------------------------------
- Mode Development:
  npm run dev
  (Aplikasi akan berjalan di http://localhost:5173 secara default)

- Production Build:
  npm run build
  (Menjalankan type check tsc dan kompilasi Vite ke folder dist/)

- Preview Production Build:
  npm run preview


5. AKUN DEMO PENGUJIAN (ROLE-BASED ACCESS CONTROL)
--------------------------------------------------------------------------------
Akun demo setelah menjalankan seeding di backend (`go run ./cmd/seed -fresh`):

Role                 Username        Password
-------------------  --------------  ------------
Super Admin          superadmin      ChangeMe123!
Tech Lead            techlead        Password123!
Project Manager      pm.andi         Password123!
Pentester            pentester.budi  Password123!
Technical Writer     writer.eka      Password123!


6. PERINTAH VERIFIKASI & KUALITAS KODE
--------------------------------------------------------------------------------
- npm run verify
  Menjalankan seluruh rangkaian uji kualitas otomatis:
  1. tokens:check   -> Validasi kontras WCAG AA/AAA tema terang & gelap
  2. check:literals -> Menjamin nol hex color manual di src/
  3. check:layers   -> Menjamin arah impor, isolasi slice, dan public API boundary FSD
  4. build          -> Validasi TypeScript strict dan bundling Vite
  5. test           -> Menjalankan seluruh test suite Vitest

- Perintah Mandiri:
  - npm test              : Eksekusi unit & smoke test (16 file test / 85 test case)
  - npm run check:layers  : Validasi kepatuhan layer & boundary FSD
  - npm run check:literals: Audit pemakaian warna manual
  - npm run tokens:check  : Audit kontras warna WCAG
  - npm run format        : Memformat seluruh kode menggunakan Prettier


7. STRUKTUR FOLDER PROYEK
--------------------------------------------------------------------------------
vapt-management-frontend/
├── design/                 # Sumber token desain Figma & skrip linter guardrails
├── public/                 # Aset statis & favicon
├── src/
│   ├── app/                # Root composition, providers, router, layouts
│   ├── pages/              # Orchestrator halaman per route (thin composition)
│   ├── widgets/            # Blok UI besar (app-header, app-sidebar, panels)
│   ├── features/           # Fitur interaktif pengguna (auth, dialog assignment)
│   ├── entities/           # Domain entities (project, finding, user, catalog, session)
│   ├── shared/             # UI kit, utility formatting, REST client, config
│   └── styles/             # Global styles, Tailwind setup, theme tokens
├── package.json
└── vite.config.ts
================================================================================
