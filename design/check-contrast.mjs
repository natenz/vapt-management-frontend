/**
 * Pengecek kontras terhadap angka yang disebut Design.md sendiri.
 *
 * Spec § 2 "How contrast is created" menyebut rasio yang diharapkan:
 *   - `border` sekitar 1.3:1 terhadap ground (hairline, memang lembut)
 *   - `border-control` 3:1 "so it is findable without color"
 *   - teks harus terbaca pada ground-nya
 *
 * Script ini membaca token hasil generate, jadi angkanya tidak pernah
 * disalin tangan. Keluar dengan kode 1 kalau ada pasangan yang gagal.
 *
 * Jalankan: npm run tokens:check
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

/** Ambil peta nama -> nilai untuk kedua tema dari modul TS hasil generate. */
function loadThemes() {
  const src = readFileSync(resolve(here, "..", "src", "shared", "lib", "tokens.ts"), "utf8");
  const json = src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1);
  const data = JSON.parse(json);
  return {
    light: new Map(data.colors.map((c) => [c.name, c.value])),
    dark: new Map(data.colors.map((c) => [c.name, c.dark])),
  };
}

const themes = loadThemes();

function channel(hex) {
  const v = parseInt(hex, 16) / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const r = channel(full.slice(0, 2));
  const g = channel(full.slice(2, 4));
  const b = channel(full.slice(4, 6));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * kind:
 *   "min"   -> rasio harus >= target
 *   "about" -> rasio harus dekat target (toleransi 0.25), untuk hairline yang
 *              memang dirancang lembut dan tidak boleh terlalu kuat juga
 */
const CHECKS = [
  // Hairline dan border kontrol — angka disebut langsung oleh spec.
  { fg: "border", bg: "bg", target: 1.3, kind: "about", why: "§ 2: hairline sekitar 1.3:1" },
  { fg: "border-control", bg: "bg", target: 3, kind: "min", why: "§ 2 + § Input: kontrol 3:1" },

  // Teks pada ground terang.
  { fg: "ink", bg: "bg", target: 4.5, kind: "min", why: "teks utama AA" },
  { fg: "ink-secondary", bg: "bg", target: 4.5, kind: "min", why: "body copy AA" },
  { fg: "ink-muted", bg: "bg", target: 4.5, kind: "min", why: "metadata AA" },
  { fg: "ink-secondary", bg: "surface-subtle", target: 4.5, kind: "min", why: "body di atas fill netral" },
  { fg: "ink-muted", bg: "surface-subtle", target: 4.5, kind: "min", why: "metadata di atas fill netral" },
  { fg: "brand", bg: "bg", target: 4.5, kind: "min", why: "text link dan label brand" },

  // Teks pada ground gelap dan brand.
  // Isian brand, BUKAN tinta brand. Lihat komentar varian solid di button.tsx.
  { fg: "on-brand", bg: "surface-brand", target: 4.5, kind: "min", why: "label tombol solid" },
  { fg: "on-brand", bg: "surface-brand-hover", target: 4.5, kind: "min", why: "tombol solid saat hover" },
  { fg: "on-brand", bg: "surface-brand-pressed", target: 4.5, kind: "min", why: "tombol solid saat pressed" },

  // Tombol outline saat hover, dan ground state terpilih.
  { fg: "brand-hover", bg: "brand-tint", target: 4.5, kind: "min", why: "label outline saat hover" },
  { fg: "ink", bg: "brand-soft", target: 4.5, kind: "min", why: "label chip/baris terpilih" },
  { fg: "ink-inverse", bg: "surface-inverse", target: 4.5, kind: "min", why: "teks pada tile charcoal" },
  { fg: "ink-inverse-muted", bg: "surface-inverse", target: 4.5, kind: "min", why: "label tile charcoal" },

  // Spec: "Do not place ink-muted text on red-100 or red-50; use red-700."
  { fg: "red-700", bg: "red-100", target: 4.5, kind: "min", why: "§ Badge: teks di atas brand-soft" },

  // Status.
  { fg: "success", bg: "success-bg", target: 4.5, kind: "min", why: "alert success" },
  { fg: "warning", bg: "warning-bg", target: 4.5, kind: "min", why: "alert warning" },
  { fg: "error", bg: "error-bg", target: 4.5, kind: "min", why: "alert error" },
  { fg: "info", bg: "info-bg", target: 4.5, kind: "min", why: "alert info" },

  // Severity (derived) — wajib lolos AA seperti status lain.
  { fg: "sev-critical-fg", bg: "sev-critical-bg", target: 4.5, kind: "min", why: "badge Critical (solid)" },
  { fg: "sev-high-fg", bg: "sev-high-bg", target: 4.5, kind: "min", why: "badge High" },
  { fg: "sev-medium-fg", bg: "sev-medium-bg", target: 4.5, kind: "min", why: "badge Medium" },
  { fg: "sev-low-fg", bg: "sev-low-bg", target: 4.5, kind: "min", why: "badge Low" },
  { fg: "sev-info-fg", bg: "sev-info-bg", target: 4.5, kind: "min", why: "badge Informational" },

  // Penanda aktivitas (derived). Ikon adalah grafik, bukan teks: WCAG 1.4.11
  // menuntut 3:1 untuk ikon putih di isian, ikon berwarna di ground soft, dan
  // isian terhadap ground halaman supaya bulatannya tetap terlihat.
  { fg: "on-brand", bg: "activity-project", target: 3, kind: "min", why: "ikon penanda project (solid)" },
  { fg: "activity-project", bg: "activity-project-bg", target: 3, kind: "min", why: "ikon penanda project (soft)" },
  { fg: "activity-project", bg: "bg", target: 3, kind: "min", why: "bulatan project terhadap halaman" },
  { fg: "on-brand", bg: "activity-assessment", target: 3, kind: "min", why: "ikon penanda assessment (solid)" },
  { fg: "activity-assessment", bg: "activity-assessment-bg", target: 3, kind: "min", why: "ikon penanda assessment (soft)" },
  { fg: "activity-assessment", bg: "bg", target: 3, kind: "min", why: "bulatan assessment terhadap halaman" },
  { fg: "on-brand", bg: "activity-scope", target: 3, kind: "min", why: "ikon penanda scope (solid)" },
  { fg: "activity-scope", bg: "activity-scope-bg", target: 3, kind: "min", why: "ikon penanda scope (soft)" },
  { fg: "activity-scope", bg: "bg", target: 3, kind: "min", why: "bulatan scope terhadap halaman" },
  { fg: "on-brand", bg: "activity-technical", target: 3, kind: "min", why: "ikon penanda technical (solid)" },
  { fg: "activity-technical", bg: "activity-technical-bg", target: 3, kind: "min", why: "ikon penanda technical (soft)" },
  { fg: "activity-technical", bg: "bg", target: 3, kind: "min", why: "bulatan technical terhadap halaman" },
  { fg: "on-brand", bg: "activity-schedule", target: 3, kind: "min", why: "ikon penanda schedule (solid)" },
  { fg: "activity-schedule", bg: "activity-schedule-bg", target: 3, kind: "min", why: "ikon penanda schedule (soft)" },
  { fg: "activity-schedule", bg: "bg", target: 3, kind: "min", why: "bulatan schedule terhadap halaman" },
  { fg: "on-brand", bg: "activity-report", target: 3, kind: "min", why: "ikon penanda report (solid)" },
  { fg: "activity-report", bg: "activity-report-bg", target: 3, kind: "min", why: "ikon penanda report (soft)" },
  { fg: "activity-report", bg: "bg", target: 3, kind: "min", why: "bulatan report terhadap halaman" },
  { fg: "on-brand", bg: "activity-approval", target: 3, kind: "min", why: "ikon penanda approval (solid)" },
  { fg: "activity-approval", bg: "activity-approval-bg", target: 3, kind: "min", why: "ikon penanda approval (soft)" },
  { fg: "activity-approval", bg: "bg", target: 3, kind: "min", why: "bulatan approval terhadap halaman" },
  { fg: "on-brand", bg: "activity-archive", target: 3, kind: "min", why: "ikon penanda archive (solid)" },
  { fg: "activity-archive", bg: "activity-archive-bg", target: 3, kind: "min", why: "ikon penanda archive (soft)" },
  { fg: "activity-archive", bg: "bg", target: 3, kind: "min", why: "bulatan archive terhadap halaman" },

  // Ikon tahap proyek (derived). Hanya varian soft: ikon berwarna di atas
  // ground tipis, jadi cukup 3:1 (WCAG 1.4.11). Labelnya memakai ink biasa.
  { fg: "stage-assessment", bg: "stage-assessment-bg", target: 3, kind: "min", why: "ikon tahap assessment" },
  { fg: "stage-analysis", bg: "stage-analysis-bg", target: 3, kind: "min", why: "ikon tahap analysis" },
  { fg: "stage-initial-report", bg: "stage-initial-report-bg", target: 3, kind: "min", why: "ikon tahap initial report" },
  { fg: "stage-remedial", bg: "stage-remedial-bg", target: 3, kind: "min", why: "ikon tahap remedial" },
  { fg: "stage-final-presentation", bg: "stage-final-presentation-bg", target: 3, kind: "min", why: "ikon tahap final presentation" },
  { fg: "stage-pending", bg: "stage-pending-bg", target: 3, kind: "min", why: "ikon status pending" },
  { fg: "stage-done", bg: "stage-done-bg", target: 3, kind: "min", why: "ikon status done" },

  // Aksen status di atas kartu gelap (kartu Butuh Tindakan).
  { fg: "inverse-warning", bg: "surface-inverse", target: 4.5, kind: "min", why: "teks warning di kartu gelap" },
  { fg: "inverse-warning", bg: "inverse-warning-bg", target: 4.5, kind: "min", why: "badge warning di kartu gelap" },
  { fg: "inverse-success", bg: "surface-inverse", target: 4.5, kind: "min", why: "teks success di kartu gelap" },
];

const ABOUT_TOLERANCE = 0.25;

/**
 * Tema gelap menambah pasangan yang tidak relevan di tema terang: ground
 * halaman dan ground kartu berbeda, jadi teks harus diuji di atas keduanya.
 */
const DARK_EXTRA = [
  { fg: "ink", bg: "surface", target: 4.5, kind: "min", why: "teks utama di atas kartu" },
  { fg: "ink-secondary", bg: "surface", target: 4.5, kind: "min", why: "body copy di atas kartu" },
  { fg: "ink-muted", bg: "surface", target: 4.5, kind: "min", why: "metadata di atas kartu" },
  { fg: "brand", bg: "surface", target: 4.5, kind: "min", why: "text link di atas kartu" },
  { fg: "border-control", bg: "surface", target: 3, kind: "min", why: "kontrol form 3:1 di atas kartu" },
];

function runTheme(name, colors, checks) {
  let failed = 0;

  console.log(`  ── tema ${name} ${"─".repeat(Math.max(0, 52 - name.length))}`);

  for (const check of checks) {
    const fg = colors.get(check.fg);
    const bg = colors.get(check.bg);

    if (!fg || !bg) {
      console.error(`  MISSING  ${check.fg} on ${check.bg} — token tidak ada`);
      failed += 1;
      continue;
    }

    const ratio = contrast(fg, bg);
    const ok =
      check.kind === "min"
        ? ratio >= check.target
        : Math.abs(ratio - check.target) <= ABOUT_TOLERANCE;

    const marker = ok ? "ok     " : "FAIL   ";
    const expectation = check.kind === "min" ? `>= ${check.target}` : `~ ${check.target}`;

    console.log(
      `  ${marker}  ${`${check.fg} on ${check.bg}`.padEnd(38)} ${ratio.toFixed(2).padStart(6)}:1  (${expectation})  ${check.why}`,
    );

    if (!ok) failed += 1;
  }

  console.log();
  return failed;
}

console.log("tokens:check    kontras terhadap angka yang disebut Design.md");
console.log();

const darkChecks = [...CHECKS, ...DARK_EXTRA];
const failedLight = runTheme("terang", themes.light, CHECKS);
const failedDark = runTheme("gelap (derived)", themes.dark, darkChecks);

const failed = failedLight + failedDark;
const total = CHECKS.length + darkChecks.length;

if (failed > 0) {
  console.error(`${failed} dari ${total} pasangan gagal.`);
  process.exit(1);
}

console.log(`${total} pasangan lolos di kedua tema.`);
