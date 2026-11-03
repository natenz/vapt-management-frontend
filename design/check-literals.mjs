/**
 * Menjaga aturan inti arsitektur: tidak ada warna yang diketik tangan di
 * dalam kode aplikasi.
 *
 * Setiap warna harus datang dari token hasil generate, lewat utility Tailwind
 * (`text-ink`, `bg-sev-high-bg`) atau `var(--color-*)`. Kalau ada hex yang
 * muncul di src/, berarti ada nilai yang lepas dari Design.md dan akan
 * diam-diam menyimpang.
 *
 * Jalankan: npm run check:literals
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const SRC = join(ROOT, "src");

/** File hasil generate memang berisi hex — di situlah tempatnya. */
const ALLOWED = new Set(
  [join("src", "styles", "tokens.css"), join("src", "shared", "lib", "tokens.ts")].map((p) =>
    p.replaceAll("\\", "/"),
  ),
);

const EXTENSIONS = [".ts", ".tsx", ".css"];
const HEX = /#[0-9a-fA-F]{3,8}\b/g;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (EXTENSIONS.some((ext) => entry.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

const findings = [];

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  if (ALLOWED.has(rel)) continue;

  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    // Anchor URL (href="#faq") dan id SVG bukan warna.
    const matches = line.match(HEX) ?? [];
    for (const match of matches) {
      const isColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(match);
      if (isColor) findings.push({ rel, line: i + 1, match, text: line.trim() });
    }
  });
}

console.log("check:literals  hex warna di luar file hasil generate\n");

if (findings.length > 0) {
  for (const f of findings) {
    console.error(`  ${f.rel}:${f.line}  ${f.match}`);
    console.error(`      ${f.text}`);
  }
  console.error(
    `\n${findings.length} hex ditemukan. Pakai token: utility Tailwind atau var(--color-*).`,
  );
  process.exit(1);
}

console.log("  tidak ada. Semua warna datang dari token.");
