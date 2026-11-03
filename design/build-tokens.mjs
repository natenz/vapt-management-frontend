/**
 * design/tokens.json (+ extension + dark) -> src/styles/tokens.css
 *
 * Meng-compile token Vermilion menjadi satu blok `@theme` Tailwind v4, plus
 * blok override untuk tema gelap. Tidak ada nilai warna/ukuran yang boleh
 * diketik tangan di luar file hasil generate ini.
 *
 * Pemetaan ke namespace Tailwind v4:
 *   color       -> --color-*        (bg-*, text-*, border-*)
 *   spacing     -> --spacing        (skala dinamis: p-6 = 6 * 4px = 24px)
 *   radius      -> --radius-*       (rounded-*)
 *   shadow      -> --shadow-*       (shadow-*)
 *   container   -> --container-*    (max-w-*)
 *   breakpoint  -> --breakpoint-*   (sm:, md:, lg:, xl:)
 *   type        -> --text-*         (+ modifier --line-height / --font-weight
 *                                    / --letter-spacing)
 *   families    -> --font-*         (font-sans, font-mono)
 *
 * stroke dan zIndex tidak punya namespace Tailwind, jadi di-emit sebagai
 * custom property biasa di :root dan dipakai lewat var().
 *
 * Tema gelap bekerja dengan menimpa --color-* pada selector yang lebih
 * spesifik. Karena setiap utility Tailwind mereferensikan var(), seluruh
 * aplikasi berbalik tanpa satu pun kelas komponen berubah.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, "..", "src", "styles", "tokens.css");
const TS_OUT = resolve(here, "..", "src", "shared", "lib", "tokens.ts");

const read = (name) => JSON.parse(readFileSync(resolve(here, name), "utf8"));

const spec = read("tokens.json");
const ext = read("tokens.extension.json");
const dark = read("tokens.dark.json");

/* ------------------------------------------------------------------ *
 * Resolusi alias: nilai "{red-600}" menunjuk ke token warna lain.
 * ------------------------------------------------------------------ */

const lightTokens = [
  ...spec.color.tokens.map((t) => ({ ...t, derived: false })),
  ...ext.color.tokens.map((t) => ({ ...t, derived: true })),
];

/** Tema gelap mewarisi tema terang untuk token yang tidak ia sebut. */
const darkOverrides = new Map(dark.color.tokens.map((t) => [t.name, t]));
const darkTokens = lightTokens.map((t) => darkOverrides.get(t.name) ?? t);

function makeResolver(tokens) {
  const byName = new Map(tokens.map((t) => [t.name, t]));

  return function resolveColor(name, seen = new Set()) {
    if (seen.has(name)) throw new Error(`Alias warna melingkar pada '${name}'`);

    const token = byName.get(name);
    if (!token) throw new Error(`Token warna '${name}' tidak ada`);

    const alias = /^\{(.+)\}$/.exec(String(token.value).trim());
    if (!alias) return String(token.value).trim();

    seen.add(name);
    return resolveColor(alias[1], seen);
  };
}

const resolveLight = makeResolver(lightTokens);
const resolveDark = makeResolver(darkTokens);

/** Token gelap yang menyebut nama tapi nilainya sama persis dengan terang tidak perlu di-emit. */
const changedInDark = lightTokens.filter(
  (t) => resolveDark(t.name) !== resolveLight(t.name),
);

/* ------------------------------------------------------------------ *
 * Guard: nama token spacing Vermilion harus identik dengan skala Tailwind.
 * space-6 = 24px dan Tailwind p-6 = 6 * 4px = 24px. Kalau suatu saat
 * Design.md mengubah nilainya, build harus gagal, bukan diam-diam salah.
 * ------------------------------------------------------------------ */

const SPACING_BASE = 4;

function assertSpacingScale(tokens) {
  const bad = [];
  for (const token of tokens) {
    const step = Number(/^space-(\d+)$/.exec(token.name)?.[1]);
    const px = Number(/^(\d+)px$/.exec(token.value)?.[1]);
    if (!Number.isFinite(step) || !Number.isFinite(px)) {
      bad.push(`${token.name}: format tak dikenal (${token.value})`);
      continue;
    }
    if (step * SPACING_BASE !== px) {
      bad.push(`${token.name}: ${px}px, tapi skala Tailwind memberi ${step * SPACING_BASE}px`);
    }
  }
  if (bad.length > 0) {
    throw new Error(
      "Skala spacing Vermilion tidak lagi sejajar dengan skala Tailwind:\n  " +
        bad.join("\n  ") +
        "\nPemetaan space-N -> p-N/h-N/gap-N tidak lagi aman.",
    );
  }
}

assertSpacingScale(spec.spacing.tokens);

/* ------------------------------------------------------------------ *
 * shadow-focus disusun dari var(), bukan dari hex.
 *
 * Spec menulisnya sebagai "0 0 0 2px #ffffff, 0 0 0 4px #b3141f": gap putih
 * 2px lalu ring merah 2px. Gap putih itu sebenarnya BUKAN putih - ia adalah
 * ground halaman, yang kebetulan putih karena Vermilion hanya punya tema
 * terang. Di atas ground gelap, gap putih menjadi garis yang salah.
 *
 * Jadi token ini di-emit sebagai komposisi var() supaya ikut tema sendiri,
 * dan builder memverifikasi bahwa di tema terang hasilnya PERSIS nilai spec.
 * Kalau Design.md mengubah nilainya, build gagal di sini.
 * ------------------------------------------------------------------ */

const FOCUS_COMPOSED = "0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-focus)";

function assertFocusComposition() {
  const specValue = spec.shadow.tokens.find((t) => t.name === "shadow-focus")?.value;
  if (!specValue) throw new Error("Token shadow-focus tidak ada di Design.md");

  const composed = `0 0 0 2px ${resolveLight("bg")}, 0 0 0 4px ${resolveLight("focus")}`;
  const norm = (s) => s.replace(/\s+/g, " ").trim().toLowerCase();

  if (norm(composed) !== norm(specValue)) {
    throw new Error(
      "shadow-focus tidak lagi bisa disusun dari token:\n" +
        `  Design.md : ${specValue}\n` +
        `  var()     : ${composed}\n` +
        "Perbarui FOCUS_COMPOSED di build-tokens.mjs.",
    );
  }
}

assertFocusComposition();

/* ------------------------------------------------------------------ *
 * Emit CSS
 * ------------------------------------------------------------------ */

const out = [];
const line = (s = "") => out.push(s);
const section = (title) => {
  line();
  line(`  /* ${title} */`);
};

/** Buang prefix famili dari nama token: "radius-md" -> "md". */
const suffix = (name, family) => name.replace(new RegExp(`^${family}-`), "");

/** letterSpacing "0" bukan panjang yang eksplisit; normalkan ke "0em". */
const normalizeTracking = (v) => (String(v).trim() === "0" ? "0em" : String(v).trim());

const typeStyles = spec.type.groups.flatMap((g) => g.styles);

line("/*");
line(" * GENERATED FILE - JANGAN DIEDIT TANGAN.");
line(" *");
line(" * Sumber : Design.md (Appendix A) -> design/tokens.json");
line(" *          design/tokens.extension.json   (severity VAPT, derived)");
line(" *          design/tokens.dark.json        (tema gelap, derived)");
line(" * Perintah: npm run tokens");
line(" *");
line(` * ${spec.name} v${spec.version}.`);
line(" * Token bertanda 'derived' tidak ada di Design.md.");
line(" */");
line();
line("@theme {");

section(`Warna - ${spec.color.tokens.length} token spec + ${ext.color.tokens.length} derived`);
for (const token of lightTokens) {
  const value = resolveLight(token.name);
  const aliasNote = /^\{.+\}$/.test(String(token.value).trim())
    ? ` /* = ${String(token.value).trim()} */`
    : "";
  const derivedNote = token.derived ? " /* derived */" : "";
  line(`  --color-${token.name}: ${value};${aliasNote}${derivedNote}`);
}

section("Spacing - space-N identik dengan skala Tailwind (p-6 = space-6 = 24px)");
line(`  --spacing: ${SPACING_BASE}px;`);

section("Radius");
for (const token of spec.radius.tokens) {
  line(`  --radius-${suffix(token.name, "radius")}: ${token.value};`);
}

section("Shadow - hanya untuk hover/overlay/focus, tidak pernah saat rest");
for (const token of spec.shadow.tokens) {
  const name = suffix(token.name, "shadow");
  if (token.name === "shadow-focus") {
    line(`  /* disusun dari var() agar gap ikut ground tema; lihat build-tokens.mjs */`);
    line(`  --shadow-focus: ${FOCUS_COMPOSED};`);
    continue;
  }
  line(`  --shadow-${name}: ${token.value};`);
}

section("Container - max-w-copy / max-w-default / max-w-nav / max-w-wide");
for (const token of spec.container.tokens) {
  line(`  --container-${suffix(token.name, "container")}: ${token.value};`);
}

section("Breakpoint");
for (const token of spec.breakpoint.tokens) {
  line(`  --breakpoint-${suffix(token.name, "bp")}: ${token.value};`);
}

section("Font family");
line(`  --font-sans: ${spec.type.families.sans};`);
line(`  --font-mono: ${spec.type.families.mono};`);

section(`Type - ${typeStyles.length} style, tiap utility membawa size + leading + weight + tracking`);
for (const group of spec.type.groups) {
  line(`  /* ${group.name} */`);
  for (const style of group.styles) {
    line(`  --text-${style.name}: ${style.fontSize};`);
    line(`  --text-${style.name}--line-height: ${style.lineHeight};`);
    line(`  --text-${style.name}--font-weight: ${style.fontWeight};`);
    line(`  --text-${style.name}--letter-spacing: ${normalizeTracking(style.letterSpacing)};`);
  }
}

line("}");
line();
line("/* Famili tanpa namespace Tailwind - dipakai lewat var() di @utility dan CSS mentah. */");
line(":root {");

section("Stroke");
for (const token of spec.stroke.tokens) {
  line(`  --${token.name}: ${token.value};`);
}

section("Z-index");
for (const token of spec.zIndex.tokens) {
  line(`  --${token.name}: ${token.value};`);
}

line("}");
line();

/* ---------------------------- tema gelap ---------------------------- */

const darkBody = [];
darkBody.push(`  color-scheme: dark;`);
darkBody.push("");
darkBody.push(`  /* Warna - ${changedInDark.length} token berubah, sisanya mewarisi tema terang */`);
for (const token of changedInDark) {
  const override = darkOverrides.get(token.name);
  const aliasNote =
    override && /^\{.+\}$/.test(String(override.value).trim())
      ? ` /* = ${String(override.value).trim()} */`
      : "";
  darkBody.push(`  --color-${token.name}: ${resolveDark(token.name)};${aliasNote}`);
}
darkBody.push("");
darkBody.push("  /* Shadow - nilai terang memakai rgba(20,20,24,...) yang tak terlihat di ground gelap */");
for (const token of dark.shadow.tokens) {
  darkBody.push(`  --${token.name}: ${token.value};`);
}

line("/*");
line(" * Tema gelap (derived - Design.md hanya mendefinisikan tema terang).");
line(" *");
line(" * shadow-focus sengaja TIDAK ditimpa: ia disusun dari var(--color-bg)");
line(" * dan var(--color-focus), jadi ia mengikuti tema dengan sendirinya.");
line(" */");
line('[data-theme="dark"] {');
line(darkBody.join("\n"));
line("}");
line();
line("/* Ikuti preferensi sistem, kecuali user memilih terang secara eksplisit. */");
line("@media (prefers-color-scheme: dark) {");
line("  :root:not([data-theme=\"light\"]) {");
line(darkBody.map((l) => (l ? `  ${l}` : l)).join("\n"));
line("  }");
line("}");
line();

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, out.join("\n"), "utf8");

/* ------------------------------------------------------------------ *
 * Emit kedua: modul TypeScript berisi token yang sudah ter-resolve.
 *
 * Dipakai katalog UI dan pengecek kontras supaya keduanya dibangkitkan dari
 * token, bukan didaftar ulang dengan tangan.
 * ------------------------------------------------------------------ */

const tsData = {
  name: spec.name,
  version: spec.version,
  colors: lightTokens.map((t) => ({
    name: t.name,
    value: resolveLight(t.name),
    dark: resolveDark(t.name),
    alias: /^\{.+\}$/.test(String(t.value).trim()) ? String(t.value).trim().slice(1, -1) : null,
    usage: t.usage,
    derived: t.derived,
    changedInDark: resolveDark(t.name) !== resolveLight(t.name),
  })),
  typeStyles: spec.type.groups.flatMap((g) =>
    g.styles.map((s) => ({
      group: g.name,
      name: s.name,
      fontSize: s.fontSize,
      lineHeight: s.lineHeight,
      fontWeight: s.fontWeight,
      letterSpacing: normalizeTracking(s.letterSpacing),
      sample: s.sample,
      usage: s.usage,
    })),
  ),
  scales: Object.fromEntries(
    ["spacing", "radius", "shadow", "stroke", "container", "breakpoint", "zIndex"].map((family) => [
      family,
      spec[family].tokens.map((t) => ({ name: t.name, value: String(t.value) })),
    ]),
  ),
};

const ts = `/**
 * GENERATED FILE - JANGAN DIEDIT TANGAN.
 *
 * Sumber : Design.md (Appendix A) + design/tokens.extension.json
 *          + design/tokens.dark.json
 * Perintah: npm run tokens
 *
 * Token yang sudah ter-resolve, untuk kode yang perlu MEMBACA daftar token
 * (katalog design system, pengecek kontras). Untuk styling, pakai utility
 * Tailwind-nya - jangan mengambil nilai dari sini.
 */

export const tokens = ${JSON.stringify(tsData, null, 2)} as const;

export type ColorToken = (typeof tokens.colors)[number];
export type TypeStyleToken = (typeof tokens.typeStyles)[number];
export type ScaleFamily = keyof typeof tokens.scales;
`;

mkdirSync(dirname(TS_OUT), { recursive: true });
writeFileSync(TS_OUT, ts, "utf8");

console.log(`tokens:build    src/styles/tokens.css + src/shared/lib/tokens.ts`);
console.log(
  `                color ${lightTokens.length} (${spec.color.tokens.length} spec + ${ext.color.tokens.length} derived)  ` +
    `type ${typeStyles.length}  radius ${spec.radius.tokens.length}  shadow ${spec.shadow.tokens.length}`,
);
console.log(`                dark: ${changedInDark.length} token warna ditimpa, ${lightTokens.length - changedInDark.length} mewarisi`);
console.log(`                spacing: skala Tailwind terverifikasi (space-N = N x ${SPACING_BASE}px)`);
console.log(`                shadow-focus: komposisi var() cocok dengan nilai Design.md`);
