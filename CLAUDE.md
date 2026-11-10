# Claude Code Guidelines: Telkom VAPT Management Frontend

Dokumen ini adalah panduan operasional komprehensif untuk Claude Code dan AI Coding Agent pada repositori **Telkom VAPT Management Frontend**.

---

## 1. Ikhtisar Repositori & Teknologi

Aplikasi frontend web enterprise untuk pengelolaan dan pemantauan siklus pengujian penetrasi (Vulnerability Assessment & Penetration Testing / VAPT) di lingkungan Telkom.

- **Framework & Runtime:** React 19, TypeScript (strict mode), Vite 6/8
- **Styling & Design Tokens:** Tailwind CSS v4, Vermilion Token Bridge (Figma "VAPT Command Center")
- **Arsitektur:** Feature-Sliced Design (FSD) v2
- **State & Server Cache:** TanStack Query (React Query v5), Zustand
- **Komponen UI & Primitives:** Radix UI, Lucide React
- **Pengujian & Kualitas:** Vitest, React Testing Library, custom FSD & token linters
- **Backend Rujukan:** `E:\Telkom\VAPT Management\Backend\vapt-management-backend` (Go Gin GORM PostgreSQL)
- **Base API URL:** `http://localhost:8080/api/v1`

---

## 2. Perintah Penting (Build, Test & Dev)

Jalankan perintah ini di dalam direktori `vapt-management-frontend/`:

### Pengembangan Lokal & Multi-Device
- `npm run dev`: Jalankan local Vite development server (listening `0.0.0.0:5173`, `allowedHosts: true`).
- `ngrok http 5173`: Buka tunnel ngrok untuk pengujian langsung di smartphone / tablet fisik.
- `npm run build`: Type-check TypeScript (`tsc --noEmit`) dan kompilasi bundle Vite ke `dist/`.
- `npm run preview`: Preview bundle produksi secara lokal.

### Pengujian & Verifikasi Kualitas
- `npm run verify`: **Pipeline wajib sebelum commit / PR** — menjalankan:
  1. `tokens:check` (audit kontras WCAG AA/AAA 123 pasang warna tema terang & gelap)
  2. `check:literals` (menolak keras penulisan kode warna hex manual di `src/`)
  3. `check:layers` (validasi arah impor dan isolasi slice FSD)
  4. `build` (`tsc --noEmit && vite build`)
  5. `test` (seluruh suite pengujian Vitest 87 test cases)
- `npm test`: Jalankan seluruh pengujian unit & smoke test sekali (18 file test / 87 test cases).
- `npm run test:watch`: Menjalankan Vitest dalam mode watch interaktif.
- `npm run check:layers`: Validasi arah impor FSD dan batas Public API.
- `npm run check:literals`: Memastikan 100% warna berasal dari token Vermilion / Tailwind.
- `npm run format`: Format seluruh kode dengan Prettier & Tailwind CSS plugin.

---

## 3. Struktur Modul & Aturan Feature-Sliced Design (FSD)

Arah impor wajib mengalir tegas dari atas ke bawah:
`app (60) > pages (50) > widgets (40) > features (30) > entities (20) > shared (10)`

```text
src/
├── app/        # [Rank 60] Composition root, providers, routing, root layouts
├── pages/      # [Rank 50] Thin orchestrator views per rute (ui/*-page.tsx + index.ts)
├── widgets/    # [Rank 40] Komposisi blok UI mandiri (app-header, app-sidebar, panels, gantt)
├── features/   # [Rank 30] Aksi & interaksi pengguna (auth, assign-mandays, manage-assets)
├── entities/   # [Rank 20] Model bisnis domain, Zod schema, kartu & store (user, project, finding)
├── shared/     # [Rank 10] Primitif mandiri bebas domain (ui kit, api client, lib, config)
└── styles/     # Tailwind entrypoint, bridge tema, CSS tokens, utilities
```

### Tiga Guardrail Arsitektur (Ditegakkan via `npm run check:layers`)
1. **Arah Impor (Downward Flow):** Layer atas hanya boleh mengimpor dari layer di bawahnya.
2. **Isolasi Slice (Slice Isolation):** Slice pada layer yang sama dilarang saling mengimpor langsung (misal: `features/auth` dilarang mengimpor `features/manage-assets`).
3. **Public API Boundary:** Impor lintas slice wajib melalui entrypoint root (`@/<layer>/<slice>`), dilarang mengimpor file internal slice (misal: `@/features/auth/api/login`).

---

## 4. Konvensi Kode & Standar Implementasi

- **Bahasa Copywriting & Komentar:** Seluruh teks UI, label form, placeholder, pesan error, alert, modal, dan komentar kode wajib menggunakan **Bahasa Indonesia**.
- **Warna & Token Sistem:** Dilarang menggunakan warna hex manual (misal `#E60012`). Wajib menggunakan semantic tokens Tailwind/Vermilion (`bg-surface`, `bg-bg`, `text-ink`, `text-ink-secondary`, `text-brand`, `border-border`, dll.).
- **Komposisi Class:** Gunakan helper `cn()` dari `@/shared/lib/cn`.
- **Penamaan File & Komponen:** File menggunakan `kebab-case.tsx` (`login-page.tsx`), komponen React menggunakan `PascalCase` (`LoginPage`).
- **Gaya Ekspor:** Gunakan *named export*, hindari *default export* kecuali diperlukan untuk lazy loading rute.
- **TypeScript:** Strict mode aktif. Gunakan `import type` untuk tipe data.
- **Testing:** Tes dikolodikasikan di sebelah file sumber (`*.test.ts` / `*.test.tsx`). Uji perilaku yang dapat diamati dan role aksesibilitas ARIA. Seluruh 87 pengujian harus selalu lolos 100%.

---

## 5. Spesifikasi Desain Responsif (Auth & Login)

Breakpoints:
- `sm`: 640px (Mobile ke Tablet kecil)
- `md`: 768px (Tablet portrait)
- `lg`: 1024px (Tablet landscape)
- Breakpoint Khusus Auth Desktop: `1301px` (`min-[1301px]:*`)

### Tiga Mode Tampilan Login:
1. **Native Mobile (`< 640px`)**:
   - **Cardless (Flat & Edge-to-Edge):** Tanpa border kartu, tanpa rounded corner luar, tanpa drop shadow (`px-5 py-2 sm:rounded-2xl sm:border sm:border-border sm:bg-surface sm:p-8 sm:shadow-raised`). Latar belakang layar penuh `bg-surface`.
   - **Full-Bleed Top Banner:** Visual server scan (`h-40`, `w-full rounded-none sm:rounded-2xl`) membentang penuh di atas layar smartphone dengan tipografi "VAPT MANAGEMENT".
   - **Center Circular Emblem:** Badge logo Trustera (`size-16`) di tengah memotong batas bawah banner dengan `border-4 border-surface`.
   - **Form:** Label "Username", placeholder "Username", Password dengan toggle eye icon, tombol solid "Masuk".

2. **Tablet (`640px – 1300px`)**:
   - Berubah menjadi kartu elevated terpusat (`sm:max-w-[460px] sm:rounded-2xl sm:shadow-raised sm:border sm:bg-surface sm:p-8`) di atas latar abu-abu `bg-bg`.
   - Visual banner atas berada di luar kartu (`sm:h-44 md:h-48`). Badge logo di tengah (`sm:size-20`).

3. **Desktop (`> 1300px`)**:
   - Split-view 2-kolom (`min-[1301px]:grid`).
   - Sisi kiri: Logo Trustera horizontal di pojok kiri atas di luar kartu, kartu login terpusat bersih tanpa banner atas.
   - Sisi kanan: `BrandPanel` aside penuh dengan visual scan dan tipografi *oversized* "VAPT MANAGEMENT".

---

## 6. Integrasi Backend, Kontrak API & State Machine

### Format Standar Amplop Respons API Go Gin
```json
{
  "success": true,
  "message": "Deskripsi operasi",
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100 },
  "errors": null
}
```

### Konvensi Krusial User ID:
- **`sys_user_id` (`sys_users`)**: Digunakan untuk identitas akun login dan penugasan peran langsung (`pm_id`, `pentester_id`, `created_by`).
- **`user_id` (`ms_user`)**: Digunakan untuk penugasan sumber daya proyek pada tabel roster `trx_resources.user_id` (`resource_user_ids`, `user_ids`).

### Alur Siklus Proyek (Application Scope):
```text
Draft ──► Planning ──► Pentest ──► Reporting ──► Remediation ──► Retest ──► Done
                                                        ▲            │ (jika reopened)
                                                        └────────────┘
```

### Akun Demo Pengujian (Seeder Backend):
| Role | Username | Password | Tanggung Jawab |
|---|---|---|---|
| **Super Admin** | `superadmin` | `ChangeMe123!` | Akses penuh sistem & user management |
| **Tech Lead** | `techlead` | `Password123!` | Template proyek, alokasi mandays, approval |
| **Project Manager** | `pm.andi` / `pm.sari` | `Password123!` | Detail jadwal, tracking eksekusi & remedi |
| **Pentester** | `pentester.budi` / `citra` / `dimas` | `Password123!` | Temuan celah keamanan (*findings*) & retest |
| **Technical Writer** | `writer.eka` | `Password123!` | Review QA narasi temuan & kompilasi laporan |
