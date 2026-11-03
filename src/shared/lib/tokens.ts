/**
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

export const tokens = {
  "name": "Vermilion",
  "version": 1,
  "colors": [
    {
      "name": "bg",
      "value": "#ffffff",
      "dark": "#0e0e10",
      "alias": null,
      "usage": "Page ground. Default background of every section; `ink`, `ink-secondary` and `ink-muted` all read on it.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "bg-wash",
      "value": "#fff5f5",
      "dark": "#1a1214",
      "alias": null,
      "usage": "Pink-tinted white used as a soft wash behind the hero and one supporting section per page (radial, fading to `bg`). `ink`, `ink-secondary`, `ink-muted` and `brand` text read on it.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "surface",
      "value": "#ffffff",
      "dark": "#17171a",
      "alias": null,
      "usage": "Card and panel fill, always paired with a `border` hairline. Same text colors as `bg`.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "surface-subtle",
      "value": "#f5f5f6",
      "dark": "#202024",
      "alias": null,
      "usage": "Quiet neutral fill: the active nav item, count badges, hover on rows, disabled fills. `ink`, `ink-secondary` and `ink-muted` read on it.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "surface-inverse",
      "value": "#1c1c1e",
      "dark": "#2a2a2e",
      "alias": null,
      "usage": "Dark charcoal tile / hero ground for high-contrast feature tiles and stat tiles. Text on it: `ink-inverse` and `ink-inverse-muted`.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "surface-inverse-raised",
      "value": "#3a3a3d",
      "dark": "#3f3f44",
      "alias": null,
      "usage": "Gradient end for `surface-inverse` tiles (top-left `surface-inverse` to bottom-right `surface-inverse-raised`). Text: `ink-inverse`.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "surface-brand",
      "value": "#d8232a",
      "dark": "#d8232a",
      "alias": "red-600",
      "usage": "Solid brand fill for icon tiles, the Pill badge and the single highlighted stat tile. Text and glyphs on it: `on-brand`.",
      "derived": false,
      "changedInDark": false
    },
    {
      "name": "ink",
      "value": "#0b0b0c",
      "dark": "#f5f5f6",
      "alias": null,
      "usage": "Headlines, card titles, nav labels, form values. 18:1 or better on `bg`, `bg-wash`, `surface` and `surface-subtle`.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "ink-secondary",
      "value": "#5e5e66",
      "dark": "#b4b4bd",
      "alias": null,
      "usage": "Body copy, subcopy, descriptions. 6.4:1 on `bg`; above 5.5:1 on `bg-wash` and `surface-subtle`.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "ink-muted",
      "value": "#6f6f77",
      "dark": "#90909a",
      "alias": null,
      "usage": "Metadata, captions, footer links, placeholders, inactive tab labels. 4.98:1 on `bg`, 4.66:1 on `bg-wash`, 4.57:1 on `surface-subtle`. Do not use on `red-50`, `red-100` or any dark surface.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "ink-disabled",
      "value": "#a1a1a8",
      "dark": "#5e5e66",
      "alias": null,
      "usage": "Disabled labels and icons only (exempt from contrast); never for anything a person must read.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "ink-inverse",
      "value": "#ffffff",
      "dark": "#ffffff",
      "alias": null,
      "usage": "Text on `surface-inverse`, `surface-inverse-raised` and photo scrims. 17:1 on `surface-inverse`, 11:1 on `surface-inverse-raised`.",
      "derived": false,
      "changedInDark": false
    },
    {
      "name": "ink-inverse-muted",
      "value": "#d4d4d8",
      "dark": "#d4d4d8",
      "alias": null,
      "usage": "Secondary text on `surface-inverse` (11.5:1) and `surface-inverse-raised` (7.7:1).",
      "derived": false,
      "changedInDark": false
    },
    {
      "name": "on-brand",
      "value": "#ffffff",
      "dark": "#ffffff",
      "alias": null,
      "usage": "Text and icons on `brand`, `brand-hover`, `brand-pressed`, `surface-brand`. 5.0:1 on `red-600`, 7:1 on `red-700`.",
      "derived": false,
      "changedInDark": false
    },
    {
      "name": "border",
      "value": "#e7e7ea",
      "dark": "#2a2a2e",
      "alias": null,
      "usage": "Hairline around cards, dividers between rows (FAQ, footer), the nav pill outline. Decorative grouping only (about 1.3:1): never the only cue for a control.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "border-strong",
      "value": "#cfcfd4",
      "dark": "#3f3f44",
      "alias": null,
      "usage": "Hover border on cards and quiet buttons; divider inside dense tables.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "border-control",
      "value": "#8a8a93",
      "dark": "#6e6e78",
      "alias": null,
      "usage": "Border of inputs, selects, checkboxes: at least 3:1 on `bg`, `bg-wash` and `surface-subtle` so a control is findable without color.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "border-brand",
      "value": "#d8232a",
      "dark": "#ec5b57",
      "alias": "red-600",
      "usage": "Outline of the primary (outline) button and the selected chip ring. 5.0:1 on `bg`.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "border-brand-soft",
      "value": "#f3b7b7",
      "dark": "#5a2326",
      "alias": null,
      "usage": "Border of the selected tab and tinted callouts, paired with `brand-soft` fill.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "red-50",
      "value": "#fef2f2",
      "dark": "#fef2f2",
      "alias": null,
      "usage": "Lightest red tint: tinted callout ground, hover ground on outline buttons. Text on it: `ink` or `red-700`.",
      "derived": false,
      "changedInDark": false
    },
    {
      "name": "red-100",
      "value": "#fde4e4",
      "dark": "#fde4e4",
      "alias": null,
      "usage": "Selected tab / chip fill, count badge on a selected tab. Text on it: `red-700` (5.7:1) or `ink`; never `brand` (4.2:1).",
      "derived": false,
      "changedInDark": false
    },
    {
      "name": "red-200",
      "value": "#f8c6c6",
      "dark": "#f8c6c6",
      "alias": null,
      "usage": "Third step of the chart ramp (`viz-5`), hover ground of selected chips. Decorative fills only.",
      "derived": false,
      "changedInDark": false
    },
    {
      "name": "red-400",
      "value": "#ec5b57",
      "dark": "#ec5b57",
      "alias": null,
      "usage": "Coral: the end of the emphasis-gradient on headline text (`ink` to `red-400`), hero glow and arcs, second chart red. Decorative and 24px+ display text only (3.4:1 on `bg`).",
      "derived": false,
      "changedInDark": false
    },
    {
      "name": "red-500",
      "value": "#ef1010",
      "dark": "#ef1010",
      "alias": null,
      "usage": "Saturated end of the dark page-banner gradient (`red-950` to `red-500`). Large white display text only (4.4:1).",
      "derived": false,
      "changedInDark": false
    },
    {
      "name": "red-600",
      "value": "#d8232a",
      "dark": "#d8232a",
      "alias": null,
      "usage": "The brand red. Actions, eyebrows, links, active labels, icon tiles. 5.0:1 on `bg` and `bg-wash`; white on it 5.0:1.",
      "derived": false,
      "changedInDark": false
    },
    {
      "name": "red-700",
      "value": "#b3141f",
      "dark": "#b3141f",
      "alias": null,
      "usage": "Deep red: hover for solid brand fills, wordmark, focus ring on light grounds, text on `red-100`. 7:1 on `bg`.",
      "derived": false,
      "changedInDark": false
    },
    {
      "name": "red-800",
      "value": "#7f1218",
      "dark": "#7f1218",
      "alias": null,
      "usage": "Pressed state; bottom end of the red feature-tile gradient (`red-600` to `red-800`).",
      "derived": false,
      "changedInDark": false
    },
    {
      "name": "red-900",
      "value": "#4a0a0d",
      "dark": "#4a0a0d",
      "alias": null,
      "usage": "Dense dark red for deep panels and chart emphasis.",
      "derived": false,
      "changedInDark": false
    },
    {
      "name": "red-950",
      "value": "#250304",
      "dark": "#250304",
      "alias": null,
      "usage": "Near-black maroon: start of the dark page-banner gradient, deepest hero ground.",
      "derived": false,
      "changedInDark": false
    },
    {
      "name": "brand",
      "value": "#d8232a",
      "dark": "#ec5b57",
      "alias": "red-600",
      "usage": "Text and stroke colour for anything the person can act on or that marks where they are: outline-button label, text links, eyebrow labels, active nav label.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "brand-hover",
      "value": "#b3141f",
      "dark": "#f8c6c6",
      "alias": "red-700",
      "usage": "Hover and focus-visible colour of `brand` text and solid brand fills.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "brand-pressed",
      "value": "#7f1218",
      "dark": "#ef1010",
      "alias": "red-800",
      "usage": "Active (pressed) colour of solid brand fills.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "brand-tint",
      "value": "#fef2f2",
      "dark": "#2a1416",
      "alias": "red-50",
      "usage": "Hover ground of outline buttons and tinted callouts.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "brand-soft",
      "value": "#fde4e4",
      "dark": "#3d1a1d",
      "alias": "red-100",
      "usage": "Selected tab, selected chip, selected row ground.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "focus",
      "value": "#b3141f",
      "dark": "#ec5b57",
      "alias": "red-700",
      "usage": "Focus ring on light grounds: 2px solid, 2px offset (`shadow-focus`). 7:1 on `bg`.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "focus-inverse",
      "value": "#ffffff",
      "dark": "#ffffff",
      "alias": null,
      "usage": "Focus ring on `surface-inverse`, photo tiles and `surface-brand`.",
      "derived": false,
      "changedInDark": false
    },
    {
      "name": "success",
      "value": "#116b33",
      "dark": "#4ec97f",
      "alias": null,
      "usage": "(derived) Text/icon of a positive status, always with a check icon and a word. 6.6:1 on `bg`, 6.0:1 on `success-bg`. Green is not in the reference; it is added because status needs a hue other than the brand red.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "success-bg",
      "value": "#eaf7ef",
      "dark": "#0e2a1a",
      "alias": null,
      "usage": "(derived) Ground of a success alert or status chip.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "success-border",
      "value": "#a9d8bb",
      "dark": "#1f5c38",
      "alias": null,
      "usage": "(derived) Border of a success alert.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "warning",
      "value": "#9a5b00",
      "dark": "#e0a33a",
      "alias": null,
      "usage": "(derived) Text/icon of a caution status, always with a triangle icon and a word. 5.4:1 on `bg`, 5.0:1 on `warning-bg`.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "warning-bg",
      "value": "#fff6e0",
      "dark": "#2b1f08",
      "alias": null,
      "usage": "(derived) Ground of a warning alert or chip.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "warning-border",
      "value": "#f0d089",
      "dark": "#6b4a10",
      "alias": null,
      "usage": "(derived) Border of a warning alert.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "error",
      "value": "#b42318",
      "dark": "#f27166",
      "alias": null,
      "usage": "(derived) Text/icon of a failure. Because the brand is red, an error is never signalled by color alone: it carries an alert icon, the word 'Error' or a message, and a `error-bg` ground. 6.5:1 on `bg`, 5.8:1 on `error-bg`.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "error-bg",
      "value": "#fef0ef",
      "dark": "#2b1210",
      "alias": null,
      "usage": "(derived) Ground of an error alert or field message.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "error-border",
      "value": "#f4b6b2",
      "dark": "#6e2a24",
      "alias": null,
      "usage": "(derived) Border of an error alert; the field border on error is `error` itself.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "info",
      "value": "#3a4557",
      "dark": "#a8b4c6",
      "alias": null,
      "usage": "(derived) Neutral slate for informational notes: no hue competes with the brand. 9.7:1 on `bg`, 8.6:1 on `info-bg`.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "info-bg",
      "value": "#f1f3f6",
      "dark": "#1a1e26",
      "alias": null,
      "usage": "(derived) Ground of an informational alert.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "info-border",
      "value": "#c9d0da",
      "dark": "#3a4557",
      "alias": null,
      "usage": "(derived) Border of an informational alert.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "viz-1",
      "value": "#d8232a",
      "dark": "#ec5b57",
      "alias": "red-600",
      "usage": "(derived) First chart series and the highlighted bar/line: the one that matters.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "viz-2",
      "value": "#2b2b2e",
      "dark": "#e4e4e8",
      "alias": null,
      "usage": "(derived) Second series: charcoal, the strongest neutral.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "viz-3",
      "value": "#8a8a93",
      "dark": "#8a8a93",
      "alias": null,
      "usage": "(derived) Third series and 'everything else' in a highlight chart.",
      "derived": false,
      "changedInDark": false
    },
    {
      "name": "viz-4",
      "value": "#ec5b57",
      "dark": "#f8c6c6",
      "alias": "red-400",
      "usage": "(derived) Fourth series; pair with a direct label, never a legend alone.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "viz-5",
      "value": "#f8c6c6",
      "dark": "#b3141f",
      "alias": "red-200",
      "usage": "(derived) Fifth series and range/confidence fills.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "viz-grid",
      "value": "#ededf0",
      "dark": "#26262a",
      "alias": null,
      "usage": "(derived) Gridlines and axis rules in charts; lighter than `border`.",
      "derived": false,
      "changedInDark": true
    },
    {
      "name": "surface-brand-hover",
      "value": "#b3141f",
      "dark": "#b3141f",
      "alias": "red-700",
      "usage": "Isian brand saat hover (tombol Solid). Terpisah dari brand-hover karena brand-hover adalah warna TINTA: di tema gelap tinta harus lebih terang, sedangkan isian harus tetap gelap agar teks putih di atasnya tetap terbaca.",
      "derived": true,
      "changedInDark": false
    },
    {
      "name": "surface-brand-pressed",
      "value": "#7f1218",
      "dark": "#7f1218",
      "alias": "red-800",
      "usage": "Isian brand saat pressed. Alasan pemisahannya sama dengan surface-brand-hover.",
      "derived": true,
      "changedInDark": false
    },
    {
      "name": "sev-critical",
      "value": "#7f1218",
      "dark": "#b3141f",
      "alias": "red-800",
      "usage": "Identitas severity Critical: warna seri chart dan ground badge. Satu-satunya badge solid di sistem - meminjam pola 'emphasis by fill' StatTile. Sengaja BUKAN brand (red-600), karena spec mengunci brand untuk action dan wayfinding.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "sev-critical-bg",
      "value": "#7f1218",
      "dark": "#b3141f",
      "alias": "red-800",
      "usage": "Ground badge Critical (solid).",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "sev-critical-fg",
      "value": "#ffffff",
      "dark": "#ffffff",
      "alias": "ink-inverse",
      "usage": "Teks dan ikon Critical di atas ground solid.",
      "derived": true,
      "changedInDark": false
    },
    {
      "name": "sev-critical-border",
      "value": "#7f1218",
      "dark": "#b3141f",
      "alias": "red-800",
      "usage": "Border Critical, sewarna ground.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "sev-high",
      "value": "#b42318",
      "dark": "#f27166",
      "alias": "error",
      "usage": "Identitas severity High.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "sev-high-bg",
      "value": "#fef0ef",
      "dark": "#2b1210",
      "alias": "error-bg",
      "usage": "Ground badge High (tinted).",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "sev-high-fg",
      "value": "#b42318",
      "dark": "#f27166",
      "alias": "error",
      "usage": "Teks dan ikon High.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "sev-high-border",
      "value": "#f4b6b2",
      "dark": "#6e2a24",
      "alias": "error-border",
      "usage": "Border badge High.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "sev-medium",
      "value": "#9a5b00",
      "dark": "#e0a33a",
      "alias": "warning",
      "usage": "Identitas severity Medium.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "sev-medium-bg",
      "value": "#fff6e0",
      "dark": "#2b1f08",
      "alias": "warning-bg",
      "usage": "Ground badge Medium (tinted).",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "sev-medium-fg",
      "value": "#9a5b00",
      "dark": "#e0a33a",
      "alias": "warning",
      "usage": "Teks dan ikon Medium.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "sev-medium-border",
      "value": "#f0d089",
      "dark": "#6b4a10",
      "alias": "warning-border",
      "usage": "Border badge Medium.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "sev-low",
      "value": "#3a4557",
      "dark": "#a8b4c6",
      "alias": "info",
      "usage": "Identitas severity Low. Slate netral, bukan hue baru (spec: 'Info uses neutral slate, not a new hue').",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "sev-low-bg",
      "value": "#f1f3f6",
      "dark": "#1a1e26",
      "alias": "info-bg",
      "usage": "Ground badge Low (tinted).",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "sev-low-fg",
      "value": "#3a4557",
      "dark": "#a8b4c6",
      "alias": "info",
      "usage": "Teks dan ikon Low.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "sev-low-border",
      "value": "#c9d0da",
      "dark": "#3a4557",
      "alias": "info-border",
      "usage": "Border badge Low.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "sev-info",
      "value": "#6f6f77",
      "dark": "#90909a",
      "alias": "ink-muted",
      "usage": "Identitas severity Informational: paling ringan, murni netral.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "sev-info-bg",
      "value": "#f5f5f6",
      "dark": "#202024",
      "alias": "surface-subtle",
      "usage": "Ground badge Informational.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "sev-info-fg",
      "value": "#6f6f77",
      "dark": "#90909a",
      "alias": "ink-muted",
      "usage": "Teks dan ikon Informational.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "sev-info-border",
      "value": "#e7e7ea",
      "dark": "#2a2a2e",
      "alias": "border",
      "usage": "Border badge Informational.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "activity-project",
      "value": "#4f6bff",
      "dark": "#4f6bff",
      "alias": null,
      "usage": "Isian penanda aktivitas Proyek (proyek dibuat/diubah). Ikon putih di atasnya 4.3:1. Isian tidak ikut tema, sama seperti surface-brand.",
      "derived": true,
      "changedInDark": false
    },
    {
      "name": "activity-project-bg",
      "value": "#eef2ff",
      "dark": "#151a33",
      "alias": null,
      "usage": "Ground varian soft penanda Proyek.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "activity-assessment",
      "value": "#6b5cc5",
      "dark": "#6b5cc5",
      "alias": null,
      "usage": "Isian penanda aktivitas Asesmen.",
      "derived": true,
      "changedInDark": false
    },
    {
      "name": "activity-assessment-bg",
      "value": "#f1eefa",
      "dark": "#1c1830",
      "alias": null,
      "usage": "Ground varian soft penanda Asesmen.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "activity-scope",
      "value": "#b56a00",
      "dark": "#b56a00",
      "alias": null,
      "usage": "Isian penanda aktivitas Ruang lingkup.",
      "derived": true,
      "changedInDark": false
    },
    {
      "name": "activity-scope-bg",
      "value": "#fff6e0",
      "dark": "#2b1f08",
      "alias": "warning-bg",
      "usage": "Ground varian soft penanda Ruang lingkup.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "activity-technical",
      "value": "#116b33",
      "dark": "#1a8f4a",
      "alias": null,
      "usage": "Isian penanda aktivitas Teknis. Nilainya sama dengan success terang, tapi sengaja literal: success naik terang di tema gelap dan ikon putih akan gagal kontras.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "activity-technical-bg",
      "value": "#eaf7ef",
      "dark": "#0e2a1a",
      "alias": "success-bg",
      "usage": "Ground varian soft penanda Teknis.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "activity-schedule",
      "value": "#7c5cba",
      "dark": "#7c5cba",
      "alias": null,
      "usage": "Isian penanda aktivitas Jadwal. Catatan: hampir sewarna dengan activity-assessment (1.03:1) - bedakan lewat ikon.",
      "derived": true,
      "changedInDark": false
    },
    {
      "name": "activity-schedule-bg",
      "value": "#f3eefa",
      "dark": "#1e1830",
      "alias": null,
      "usage": "Ground varian soft penanda Jadwal.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "activity-report",
      "value": "#198fa8",
      "dark": "#198fa8",
      "alias": null,
      "usage": "Isian penanda aktivitas Laporan.",
      "derived": true,
      "changedInDark": false
    },
    {
      "name": "activity-report-bg",
      "value": "#e8f7fa",
      "dark": "#0c2328",
      "alias": null,
      "usage": "Ground varian soft penanda Laporan.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "activity-approval",
      "value": "#d8232a",
      "dark": "#d8232a",
      "alias": "red-600",
      "usage": "Isian penanda aktivitas Persetujuan.",
      "derived": true,
      "changedInDark": false
    },
    {
      "name": "activity-approval-bg",
      "value": "#fef2f2",
      "dark": "#2a1416",
      "alias": "brand-tint",
      "usage": "Ground varian soft penanda Persetujuan.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "activity-archive",
      "value": "#6f6f77",
      "dark": "#6f6f77",
      "alias": null,
      "usage": "Isian penanda aktivitas Arsip. Literal, bukan {ink-muted}, karena ink-muted naik terang di tema gelap.",
      "derived": true,
      "changedInDark": false
    },
    {
      "name": "activity-archive-bg",
      "value": "#f5f5f6",
      "dark": "#202024",
      "alias": "surface-subtle",
      "usage": "Ground varian soft penanda Arsip.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "stage-assessment",
      "value": "#2563eb",
      "dark": "#6f9cf5",
      "alias": null,
      "usage": "Ikon dan aksen tahap Assessment (FileSearch).",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "stage-assessment-bg",
      "value": "#eaf1fe",
      "dark": "#131c33",
      "alias": null,
      "usage": "Ground ikon dan kartu tahap Assessment.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "stage-analysis",
      "value": "#6d4ed8",
      "dark": "#a390f0",
      "alias": null,
      "usage": "Ikon dan aksen tahap Analysis (BarChart3).",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "stage-analysis-bg",
      "value": "#f1edfd",
      "dark": "#1c1830",
      "alias": null,
      "usage": "Ground ikon dan kartu tahap Analysis.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "stage-initial-report",
      "value": "#0f7f86",
      "dark": "#4cc3ca",
      "alias": null,
      "usage": "Ikon dan aksen tahap Initial Report (FileText).",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "stage-initial-report-bg",
      "value": "#e5f6f7",
      "dark": "#0c2328",
      "alias": null,
      "usage": "Ground ikon dan kartu tahap Initial Report.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "stage-remedial",
      "value": "#c2530a",
      "dark": "#f28c45",
      "alias": null,
      "usage": "Ikon dan aksen tahap Remedial (Wrench).",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "stage-remedial-bg",
      "value": "#fff0e5",
      "dark": "#2b1a0c",
      "alias": null,
      "usage": "Ground ikon dan kartu tahap Remedial.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "stage-final-presentation",
      "value": "#15803d",
      "dark": "#4cc77a",
      "alias": null,
      "usage": "Ikon dan aksen tahap Final Presentation (Presentation).",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "stage-final-presentation-bg",
      "value": "#eaf7ef",
      "dark": "#0e2a1a",
      "alias": "success-bg",
      "usage": "Ground ikon dan kartu tahap Final Presentation.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "stage-pending",
      "value": "#a16207",
      "dark": "#e8b43a",
      "alias": null,
      "usage": "Ikon dan aksen status Pending (Clock). Kuning digelapkan ke amber agar ikon lolos 3:1.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "stage-pending-bg",
      "value": "#fef7dc",
      "dark": "#2b2208",
      "alias": null,
      "usage": "Ground ikon dan kartu status Pending.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "stage-done",
      "value": "#d8232a",
      "dark": "#f26b70",
      "alias": "red-600",
      "usage": "Ikon dan aksen status DONE (CircleCheck). Merah brand, bukan hijau, mengikuti referensi desain.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "stage-done-bg",
      "value": "#fef2f2",
      "dark": "#2a1416",
      "alias": "brand-tint",
      "usage": "Ground ikon dan kartu status DONE.",
      "derived": true,
      "changedInDark": true
    },
    {
      "name": "inverse-warning",
      "value": "#ffd666",
      "dark": "#ffd666",
      "alias": null,
      "usage": "Teks/ikon warning di atas surface-inverse (kartu gelap). Tidak ikut tema karena surface-inverse gelap di kedua tema.",
      "derived": true,
      "changedInDark": false
    },
    {
      "name": "inverse-warning-bg",
      "value": "#3a2a08",
      "dark": "#3a2a08",
      "alias": null,
      "usage": "Ground badge warning di atas surface-inverse.",
      "derived": true,
      "changedInDark": false
    },
    {
      "name": "inverse-warning-border",
      "value": "#8a6414",
      "dark": "#8a6414",
      "alias": null,
      "usage": "Border badge warning di atas surface-inverse.",
      "derived": true,
      "changedInDark": false
    },
    {
      "name": "inverse-success",
      "value": "#7ee2a3",
      "dark": "#7ee2a3",
      "alias": null,
      "usage": "Teks/ikon success di atas surface-inverse.",
      "derived": true,
      "changedInDark": false
    }
  ],
  "typeStyles": [
    {
      "group": "Display",
      "name": "display",
      "fontSize": "40px",
      "lineHeight": "46px",
      "fontWeight": 500,
      "letterSpacing": "-0.02em",
      "sample": "Downtime doesn't wait. Neither should you.",
      "usage": "Hero headline and centered section titles. `ink`, with the emphasis gradient (`ink` to `red-400`) on the closing phrase."
    },
    {
      "group": "Display",
      "name": "heading-1",
      "fontSize": "36px",
      "lineHeight": "44px",
      "fontWeight": 500,
      "letterSpacing": "-0.02em",
      "sample": "Why teams switch",
      "usage": "Left-aligned section title beside media. One word may carry a 3px `brand` underline."
    },
    {
      "group": "Display",
      "name": "heading-page",
      "fontSize": "36px",
      "lineHeight": "44px",
      "fontWeight": 600,
      "letterSpacing": "-0.02em",
      "sample": "Frequently asked questions",
      "usage": "Page title inside the dark gradient banner, `ink-inverse`. Bolder than `heading-1` because it sits on a busy ground."
    },
    {
      "group": "Titles",
      "name": "title-lg",
      "fontSize": "20px",
      "lineHeight": "32px",
      "fontWeight": 500,
      "letterSpacing": "0em",
      "sample": "Uptime monitoring",
      "usage": "Feature-card title (may wrap to two lines on 32px leading). `ink`."
    },
    {
      "group": "Titles",
      "name": "title-md",
      "fontSize": "18px",
      "lineHeight": "28px",
      "fontWeight": 500,
      "letterSpacing": "0em",
      "sample": "Guarding customer records",
      "usage": "Segment/industry card title beneath its eyebrow. `ink`."
    },
    {
      "group": "Titles",
      "name": "title-sm",
      "fontSize": "16px",
      "lineHeight": "24px",
      "fontWeight": 500,
      "letterSpacing": "0em",
      "sample": "End-to-end coverage",
      "usage": "List-item titles, accordion questions, tab labels. `ink`."
    },
    {
      "group": "Body",
      "name": "body-lg",
      "fontSize": "16px",
      "lineHeight": "24px",
      "fontWeight": 400,
      "letterSpacing": "0.01em",
      "sample": "Enterprise-grade tooling, managed for you, without hiring an entire team.",
      "usage": "Hero subcopy, accordion answers, footer descriptions. `ink-secondary`, 640px max measure."
    },
    {
      "group": "Body",
      "name": "body",
      "fontSize": "15px",
      "lineHeight": "24px",
      "fontWeight": 400,
      "letterSpacing": "0.01em",
      "sample": "Unified visibility across every site, before it becomes an incident.",
      "usage": "Card descriptions in wide cards. `ink-secondary`."
    },
    {
      "group": "Body",
      "name": "body-sm",
      "fontSize": "14px",
      "lineHeight": "24px",
      "fontWeight": 400,
      "letterSpacing": "0.01em",
      "sample": "A short line that says what it does. And the promise.",
      "usage": "Compact card descriptions and list-item descriptions. `ink-secondary`."
    },
    {
      "group": "Body",
      "name": "caption",
      "fontSize": "12px",
      "lineHeight": "18px",
      "fontWeight": 400,
      "letterSpacing": "0.01em",
      "sample": "support@example.com",
      "usage": "Footer links, helper text, timestamps. `ink-muted`."
    },
    {
      "group": "UI",
      "name": "eyebrow",
      "fontSize": "14px",
      "lineHeight": "20px",
      "fontWeight": 400,
      "letterSpacing": "0.02em",
      "sample": "About us",
      "usage": "Section eyebrow and category label, set UPPERCASE (text-transform) in `brand`."
    },
    {
      "group": "UI",
      "name": "overline",
      "fontSize": "12px",
      "lineHeight": "16px",
      "fontWeight": 400,
      "letterSpacing": "0.12em",
      "sample": "Trusted by these teams",
      "usage": "Quiet uppercase label over a logo strip or group. `ink-muted`; wide tracking is the point."
    },
    {
      "group": "UI",
      "name": "button",
      "fontSize": "14px",
      "lineHeight": "20px",
      "fontWeight": 500,
      "letterSpacing": "0em",
      "sample": "Explore solutions",
      "usage": "Button and text-link labels."
    },
    {
      "group": "UI",
      "name": "nav-link",
      "fontSize": "14px",
      "lineHeight": "20px",
      "fontWeight": 400,
      "letterSpacing": "0em",
      "sample": "Product",
      "usage": "Navigation items: `ink-secondary` resting, `brand` when active."
    },
    {
      "group": "UI",
      "name": "badge",
      "fontSize": "12px",
      "lineHeight": "16px",
      "fontWeight": 500,
      "letterSpacing": "0em",
      "sample": "Powered by",
      "usage": "Pills and count badges."
    },
    {
      "group": "UI",
      "name": "input",
      "fontSize": "14px",
      "lineHeight": "20px",
      "fontWeight": 400,
      "letterSpacing": "0em",
      "sample": "Search your question...",
      "usage": "Field values and placeholders (`ink-muted`)."
    },
    {
      "group": "Metrics",
      "name": "stat-number",
      "fontSize": "40px",
      "lineHeight": "48px",
      "fontWeight": 600,
      "letterSpacing": "-0.01em",
      "sample": "10K+",
      "usage": "Metric numerals on stat tiles, `ink-inverse`. Use tabular figures (`font-variant-numeric: tabular-nums`) in tables and charts."
    },
    {
      "group": "Metrics",
      "name": "stat-label",
      "fontSize": "20px",
      "lineHeight": "28px",
      "fontWeight": 500,
      "letterSpacing": "0em",
      "sample": "Incidents handled",
      "usage": "Label beneath a stat numeral, `ink-inverse`."
    }
  ],
  "scales": {
    "spacing": [
      {
        "name": "space-1",
        "value": "4px"
      },
      {
        "name": "space-2",
        "value": "8px"
      },
      {
        "name": "space-3",
        "value": "12px"
      },
      {
        "name": "space-4",
        "value": "16px"
      },
      {
        "name": "space-5",
        "value": "20px"
      },
      {
        "name": "space-6",
        "value": "24px"
      },
      {
        "name": "space-8",
        "value": "32px"
      },
      {
        "name": "space-10",
        "value": "40px"
      },
      {
        "name": "space-12",
        "value": "48px"
      },
      {
        "name": "space-16",
        "value": "64px"
      },
      {
        "name": "space-24",
        "value": "96px"
      },
      {
        "name": "space-32",
        "value": "128px"
      }
    ],
    "radius": [
      {
        "name": "radius-xs",
        "value": "4px"
      },
      {
        "name": "radius-sm",
        "value": "8px"
      },
      {
        "name": "radius-md",
        "value": "12px"
      },
      {
        "name": "radius-lg",
        "value": "16px"
      },
      {
        "name": "radius-xl",
        "value": "24px"
      },
      {
        "name": "radius-full",
        "value": "9999px"
      }
    ],
    "shadow": [
      {
        "name": "shadow-float",
        "value": "0 2px 12px 0 rgba(20,20,24,0.08)"
      },
      {
        "name": "shadow-raised",
        "value": "0 8px 24px -4px rgba(20,20,24,0.10)"
      },
      {
        "name": "shadow-overlay",
        "value": "0 24px 48px -12px rgba(20,20,24,0.24)"
      },
      {
        "name": "shadow-ring",
        "value": "0 0 0 4px rgba(20,20,24,0.05)"
      },
      {
        "name": "shadow-focus",
        "value": "0 0 0 2px #ffffff, 0 0 0 4px #b3141f"
      },
      {
        "name": "shadow-glow",
        "value": "0 0 120px 20px rgba(236,91,87,0.30)"
      }
    ],
    "stroke": [
      {
        "name": "stroke-hairline",
        "value": "1px"
      },
      {
        "name": "stroke-strong",
        "value": "2px"
      },
      {
        "name": "stroke-icon",
        "value": "1.5px"
      }
    ],
    "container": [
      {
        "name": "container-copy",
        "value": "640px"
      },
      {
        "name": "container-default",
        "value": "1120px"
      },
      {
        "name": "container-nav",
        "value": "1200px"
      },
      {
        "name": "container-wide",
        "value": "1280px"
      }
    ],
    "breakpoint": [
      {
        "name": "bp-sm",
        "value": "640px"
      },
      {
        "name": "bp-md",
        "value": "768px"
      },
      {
        "name": "bp-lg",
        "value": "1024px"
      },
      {
        "name": "bp-xl",
        "value": "1280px"
      }
    ],
    "zIndex": [
      {
        "name": "z-base",
        "value": "0"
      },
      {
        "name": "z-nav",
        "value": "50"
      },
      {
        "name": "z-overlay",
        "value": "100"
      },
      {
        "name": "z-modal",
        "value": "200"
      }
    ]
  }
} as const;

export type ColorToken = (typeof tokens.colors)[number];
export type TypeStyleToken = (typeof tokens.typeStyles)[number];
export type ScaleFamily = keyof typeof tokens.scales;
