const fmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });

/** Tanggal BE (YYYY-MM-DD atau ISO) -> "3 Nov 2026". */
export function fmtDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : fmt.format(d);
}

export function fmtRange(a?: string | null, b?: string | null) {
  return `${fmtDate(a)} – ${fmtDate(b)}`;
}

export function toSeverityKey(s: string): "critical" | "high" | "medium" | "low" | "info" {
  const k = s.toLowerCase();
  return k === "critical" || k === "high" || k === "medium" || k === "low" ? k : "info";
}
