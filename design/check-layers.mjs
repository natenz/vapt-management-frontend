/**
 * Menegakkan aturan impor Feature-Sliced Design.
 *
 * FSD hanya berguna kalau arah impornya dijaga. Tanpa pemeriksa, dalam
 * beberapa pekan `entities` akan mengimpor `widgets` dan strukturnya kembali
 * jadi folder biasa.
 *
 * Tiga aturan:
 *
 *   1. ARAH — sebuah layer hanya boleh mengimpor dari layer DI BAWAHNYA.
 *        app > pages > widgets > features > entities > shared
 *
 *   2. ISOLASI SLICE — di dalam satu layer, sebuah slice tidak boleh
 *      mengimpor slice tetangganya. `features/filter-findings` tidak boleh
 *      menyentuh `features/export-report`; kalau butuh, yang dipakai bersama
 *      turun ke layer di bawahnya.
 *      `shared` dan `app` dikecualikan: isinya segmen (ui, lib, api), bukan slice.
 *
 *   3. PUBLIC API BOUNDARY — modul di luar sebuah slice hanya boleh mengimpor
 *      lewat entry point publik slice tersebut (`@/<layer>/<slice>`), bukan
 *      mengakses internal modul secara langsung (`@/<layer>/<slice>/ui/...`).
 *
 * Jalankan: npm run check:layers
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const SRC = join(ROOT, "src");

/** Makin besar makin tinggi. Layer hanya boleh mengimpor rank yang lebih kecil. */
const RANK = {
  app: 60,
  pages: 50,
  widgets: 40,
  features: 30,
  entities: 20,
  shared: 10,
};

/** Layer yang isinya segmen, bukan slice — impor antar-folder di dalamnya bebas. */
const SEGMENT_LAYERS = new Set(["shared", "app"]);

/** Di luar arsitektur: CSS, deklarasi tipe, entry point. */
const EXEMPT = new Set(["styles", "vite-env.d.ts", "main.tsx"]);

const EXTENSIONS = [".ts", ".tsx"];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (EXTENSIONS.some((ext) => entry.endsWith(ext))) out.push(full);
  }
  return out;
}

/** "src/features/filter-findings/ui/x.tsx" -> { layer, slice } */
function locate(absPath) {
  const rel = relative(SRC, absPath).replaceAll("\\", "/");
  const [layer, second] = rel.split("/");
  if (!layer || EXEMPT.has(layer)) return null;
  if (!(layer in RANK)) return null;
  return { layer, slice: SEGMENT_LAYERS.has(layer) ? null : (second ?? null) };
}

/** Ambil semua specifier modul dari sebuah file. */
function importsOf(source) {
  const specifiers = [];
  const patterns = [
    /\bfrom\s+["']([^"']+)["']/g,
    /\bimport\s+["']([^"']+)["']/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) specifiers.push(match[1]);
  }
  return specifiers;
}

/** Ubah specifier menjadi lokasi layer/slice, atau null kalau bukan modul internal. */
function resolveTarget(specifier, fromFile) {
  if (specifier.startsWith("@/")) {
    return locate(join(SRC, specifier.slice(2)));
  }
  if (specifier.startsWith(".")) {
    return locate(resolve(dirname(fromFile), specifier));
  }
  return null; // paket node_modules
}

const violations = [];

for (const file of walk(SRC)) {
  const from = locate(file);
  if (!from) continue;

  const rel = relative(ROOT, file).replaceAll("\\", "/");
  const source = readFileSync(file, "utf8");

  for (const specifier of importsOf(source)) {
    const to = resolveTarget(specifier, file);
    if (!to) continue;

    // Aturan 1: arah.
    if (RANK[to.layer] > RANK[from.layer]) {
      violations.push({
        rel,
        specifier,
        reason: `${from.layer} tidak boleh mengimpor ${to.layer} (arah FSD terbalik)`,
      });
      continue;
    }

    // Aturan 2: isolasi slice dalam satu layer.
    if (
      to.layer === from.layer &&
      !SEGMENT_LAYERS.has(from.layer) &&
      from.slice &&
      to.slice &&
      from.slice !== to.slice
    ) {
      violations.push({
        rel,
        specifier,
        reason: `slice '${from.slice}' menyentuh slice tetangga '${to.slice}' di layer ${from.layer} — turunkan yang dipakai bersama ke layer di bawahnya`,
      });
      continue;
    }

    // Aturan 3: public API boundary.
    // Impor ke sliced layer (pages, widgets, features, entities) dari luar slice
    // harus melalui entry point publik slice (@/<layer>/<slice>), bukan internal path.
    if (!SEGMENT_LAYERS.has(to.layer) && to.slice) {
      const isOutsideSlice = from.layer !== to.layer || from.slice !== to.slice;
      if (isOutsideSlice) {
        if (specifier.startsWith("@/")) {
          const parts = specifier.split("/");
          // Pola publik yang sah: @/<layer>/<slice> (panjang 3) atau @/<layer>/<slice>/index
          if (parts.length > 3 && !(parts.length === 4 && parts[3] === "index")) {
            violations.push({
              rel,
              specifier,
              reason: `impor ke slice '${to.slice}' di layer ${to.layer} harus lewat Public API (@/${to.layer}/${to.slice}), dilarang mengimpor internal path`,
            });
            continue;
          }
        } else if (specifier.startsWith(".")) {
          const targetAbs = resolve(dirname(file), specifier).replaceAll("\\", "/");
          const sliceRootAbs = join(SRC, to.layer, to.slice).replaceAll("\\", "/");
          const isRootOrIndex =
            targetAbs === sliceRootAbs ||
            targetAbs === `${sliceRootAbs}/index` ||
            targetAbs === `${sliceRootAbs}/index.ts` ||
            targetAbs === `${sliceRootAbs}/index.tsx`;

          if (!isRootOrIndex) {
            violations.push({
              rel,
              specifier,
              reason: `impor ke slice '${to.slice}' di layer ${to.layer} dari luar slice harus lewat Public API (@/${to.layer}/${to.slice}), bukan impor relatif ke internal path`,
            });
            continue;
          }
        }
      }
    }
  }
}

console.log("check:layers    arah impor Feature-Sliced Design\n");

if (violations.length > 0) {
  for (const v of violations) {
    console.error(`  ${v.rel}`);
    console.error(`      import "${v.specifier}"`);
    console.error(`      ${v.reason}\n`);
  }
  console.error(`${violations.length} pelanggaran.`);
  process.exit(1);
}

console.log("  app > pages > widgets > features > entities > shared — arah, isolasi slice, dan public API boundary terjaga.");
