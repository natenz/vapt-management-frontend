# VAPT Management Frontend

React 19 + Vite + Tailwind 4 + TanStack Query. Token desain dari Figma "VAPT Command Center".
Backend: `vapt-management-backend` (branch `development`).

## Jalankan
    npm ci
    cp .env.example .env     # VITE_API_BASE_URL -> URL BE termasuk /api/v1
    npm run dev

Akun demo (setelah `go run ./cmd/seed -fresh` di BE): `techlead`, `pm.andi`, `pentester.budi`,
`writer.eka` dengan password `Password123!`; `superadmin` dengan `ChangeMe123!`.

## Cek
    npx tsc --noEmit && npm test && npm run build && npm run check:layers
    CONTRACT_API=http://localhost:8088/api/v1 npx vitest run src/app/contract.test.ts   # BE harus hidup

## Belum ada (karena BE belum punya)
- Kolom template Tracking Finding: impact, CWE, recommendation, references, findings code.
- Upload evidence ke S3 (BE hanya menerima metadata), generate/unduh laporan PDF/DOCX, retest, CRUD user.
- Token JWT disimpan di sessionStorage; BE belum punya refresh token/cookie HttpOnly.
