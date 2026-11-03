/**
 * Design.md (Appendix A) -> design/tokens.json
 *
 * Appendix A memuat tokens.json verbatim tapi ter-escape gaya markdown:
 *   - indentasi ditulis sebagai entity `&#x20;`
 *   - setiap baris dipisah baris kosong
 *   - karakter markdown di-escape: \# \[ \] \* \_ dst.
 *   - quote di dalam string JSON ditulis \\" (backslash ganda)
 *
 * Script ini membalik semua itu lalu memvalidasi hasilnya dengan JSON.parse.
 * Design.md adalah source of truth; tokens.json adalah artefak turunan.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const SPEC = resolve(here, "..", "Design.md");
const OUT = resolve(here, "tokens.json");

/** Karakter yang di-escape oleh penulis markdown dan harus dikembalikan. */
const MD_ESCAPED = new Set("[]*_`#-.{}()!>+");

function unescapeLine(line) {
  const src = line.replace(/&#x20;/g, " ");
  let out = "";
  for (let i = 0; i < src.length; i += 1) {
    if (src[i] === "\\" && i + 1 < src.length) {
      const next = src[i + 1];
      // \ -> \  (menjaga \" di dalam string JSON tetap utuh)
      if (next === "\\") {
        out += "\\";
        i += 1;
        continue;
      }
      // \# -> #, \[ -> [, dst.
      if (MD_ESCAPED.has(next)) continue;
    }
    out += src[i];
  }
  return out;
}

/** Ambil isi fence ```json pertama setelah heading Appendix A. */
function extractJsonFence(markdown) {
  const lines = markdown.split(/\r?\n/);
  const appendixAt = lines.findIndex((l) => l.includes("Appendix A. tokens.json"));
  if (appendixAt === -1) {
    throw new Error("Heading 'Appendix A' tidak ditemukan di Design.md");
  }

  let start = -1;
  for (let i = appendixAt; i < lines.length; i += 1) {
    if (lines[i].trim().startsWith("```")) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) throw new Error("Code fence setelah Appendix A tidak ditemukan");

  let end = -1;
  for (let i = start; i < lines.length; i += 1) {
    if (lines[i].trim().startsWith("```")) {
      end = i;
      break;
    }
  }
  if (end === -1) throw new Error("Penutup code fence tidak ditemukan");

  return lines
    .slice(start, end)
    .filter((l) => l.trim() !== "")
    .map(unescapeLine)
    .join("\n");
}

const markdown = readFileSync(SPEC, "utf8");
const raw = extractJsonFence(markdown);

let tokens;
try {
  tokens = JSON.parse(raw);
} catch (err) {
  throw new Error(
    `Hasil unescape Appendix A bukan JSON valid: ${err.message}\n` +
      "Kemungkinan pola escape di Design.md berubah.",
  );
}

writeFileSync(OUT, `${JSON.stringify(tokens, null, 2)}\n`, "utf8");

const counts = {
  color: tokens.color.tokens.length,
  type: tokens.type.groups.reduce((n, g) => n + g.styles.length, 0),
  spacing: tokens.spacing.tokens.length,
  radius: tokens.radius.tokens.length,
  shadow: tokens.shadow.tokens.length,
  stroke: tokens.stroke.tokens.length,
  container: tokens.container.tokens.length,
  breakpoint: tokens.breakpoint.tokens.length,
  zIndex: tokens.zIndex.tokens.length,
};
console.log(`tokens:extract  ${tokens.name} v${tokens.version} -> design/tokens.json`);
console.log(
  `                ${Object.entries(counts)
    .map(([k, v]) => `${k} ${v}`)
    .join("  ")}`,
);
