/*
 * Warna batang Gantt per status — rona sama dengan ProjectStatusBadge, namun
 * diredam: terang = pastel dengan aksen tepi kiri; gelap = tint transparan.
 * Hanya kelas Tailwind (tanpa hex) agar lolos check:literals.
 */
const STATUS_BAR_CLASS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-800 border-slate-400 dark:bg-slate-400/20 dark:text-slate-200",
  Planning: "bg-sky-100 text-sky-900 border-sky-500 dark:bg-sky-400/20 dark:text-sky-200",
  Scoping: "bg-cyan-100 text-cyan-900 border-cyan-500 dark:bg-cyan-400/20 dark:text-cyan-200",
  Assessment:
    "bg-amber-100 text-amber-900 border-amber-500 dark:bg-amber-400/20 dark:text-amber-200",
  Analysis:
    "bg-indigo-100 text-indigo-900 border-indigo-500 dark:bg-indigo-400/20 dark:text-indigo-200",
  "Initial Report":
    "bg-blue-100 text-blue-900 border-blue-500 dark:bg-blue-400/20 dark:text-blue-200",
  Remediasi: "bg-rose-100 text-rose-900 border-rose-500 dark:bg-rose-400/20 dark:text-rose-200",
  Retesting:
    "bg-purple-100 text-purple-900 border-purple-500 dark:bg-purple-400/20 dark:text-purple-200",
  "Final Report Drafting":
    "bg-teal-100 text-teal-900 border-teal-500 dark:bg-teal-400/20 dark:text-teal-200",
  "Final Presentation":
    "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-500 dark:bg-fuchsia-400/20 dark:text-fuchsia-200",
  Done: "bg-emerald-100 text-emerald-900 border-emerald-500 dark:bg-emerald-400/20 dark:text-emerald-200",
};

const FALLBACK = "bg-surface-subtle text-ink-secondary border-border-strong";

/** Batang baris grup: netral agar tidak bersaing dengan batang proyek. */
export const GROUP_BAR_CLASS = "bg-ink-muted/15 text-ink-secondary border-ink-muted";

export const statusBarClass = (status?: string) =>
  (status && STATUS_BAR_CLASS[status]) || FALLBACK;
