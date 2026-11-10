# VAPT Management Frontend

React 19 + Vite + Tailwind 4 + TanStack Query mengimplementasikan arsitektur enterprise Feature-Sliced Design (FSD). Token desain dari Figma "VAPT Command Center".
Backend: `vapt-management-backend` (branch `development`).

## Struktur Arsitektur (Feature-Sliced Design)

Hierarki modul mengalir tegas dari atas ke bawah:
`app (60) > pages (50) > widgets (40) > features (30) > entities (20) > shared (10)`

- `src/app/`: Composition root (providers, router, layouts, root entry).
- `src/pages/`: Thin compositions per rute (`ui/*-page.tsx` + `index.ts`).
- `src/widgets/`: Komposisi UI berskala blok/kompleks (`app-header`, `app-sidebar`, `project-findings-panel`, `project-gantt-section`, `project-team-sidebar`).
- `src/features/`: Perilaku interaktif pengguna (`assign-mandays`, `assign-project-team`, `auth`, `manage-assets`, `toggle-sidebar`, `toggle-theme`).
- `src/entities/`: Domain data, skema, dan model bisnis (`catalog`, `finding`, `project`, `session`, `user`).
- `src/shared/`: Primitif tanpa logika bisnis (`api`, `config`, `lib`, `ui`).

Aturan arsitektur divalidasi secara otomatis melalui guardrail linter:
1. **Arah Impor**: Modul hanya boleh mengimpor dari layer di bawahnya.
2. **Isolasi Slice**: Modul dilarang mengimpor slice tetangga pada layer yang sama.
3. **Public API Boundary**: Impor dari luar slice wajib melalui entry point root (`@/<layer>/<slice>`).

## Jalankan
    npm ci
    cp .env.example .env     # VITE_API_BASE_URL -> URL BE termasuk /api/v1
    npm run dev

Akun demo (setelah `go run ./cmd/seed -fresh` di BE): `techlead`, `pm.andi`, `pentester.budi`,
`writer.eka` dengan password `Password123!`; `superadmin` dengan `ChangeMe123!`.

## Verifikasi & Kualitas Kode
    npm run verify                                                                      # Rangkaian lengkap: tokens, literals, layers, build, test
    npm run check:layers                                                                # Validasi FSD layer hierarchy & public API boundary
    npm run check:literals                                                              # Validasi 0 hex colors manual di src/
    npm run tokens:check                                                                # Validasi kontras WCAG tema terang & gelap
    CONTRACT_API=http://localhost:8088/api/v1 npx vitest run src/app/contract.test.ts   # BE harus hidup

## Belum ada (karena BE belum punya)
- Kolom template Tracking Finding: impact, CWE, recommendation, references, findings code.
- Upload evidence ke S3 (BE hanya menerima metadata), generate/unduh laporan PDF/DOCX, retest, CRUD user.
- Token JWT disimpan di sessionStorage; BE belum punya refresh token/cookie HttpOnly.
