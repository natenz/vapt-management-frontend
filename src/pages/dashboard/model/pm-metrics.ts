/**
 * Agregasi dashboard Project Manager: proyek yang menunggu keputusan PM
 * (Scoping, Remediasi, Retesting) beserta progres temuannya.
 *
 * BE sudah menyaring proyek PM (pm_id = diri sendiri, Scoping..Done). Tidak ada
 * lagi status Planning: proyek diserahkan Tech Lead langsung masuk Scoping, dan
 * PM menyiapkan aset & pentester di tahap itu (syarat BE untuk masuk Assessment).
 */
import type { ProjectReport } from "@/entities/finding";
import type { Project, ProjectDetail } from "@/entities/project";
import { byPriority, stageSchedule, statusOf, type BaseWorkItem } from "./role-work";
import { todayIso } from "./techlead-metrics";

/** Status yang menunggu tindakan PM. */
export const PM_TURN = ["Scoping", "Remediasi", "Retesting"] as const;

export const PM_NEXT_STEP: Record<string, string> = {
  Scoping: "Konfirmasi scope, isi aset, dan assign pentester",
  Assessment: "Pentester sedang menguji",
  Analysis: "Analisis dan validasi temuan",
  "Initial Report": "Tech Writer menyusun Initial Report",
  Remediasi: "Mulai Retesting setelah klien selesai",
  Retesting: "Tutup Retesting atau kembalikan ke Remediasi",
  "Final Report Drafting": "Tech Writer menyusun Final Report",
  "Final Presentation": "Presentasi hasil ke klien",
};

export const isPmTurn = (p: Project) => (PM_TURN as readonly string[]).includes(statusOf(p));

type Finding = ProjectReport["findings"][number];
const OPEN = new Set(["open", "reopened"]);

/* ---------- Penanganan temuan ---------- */

export interface FindingProgress {
  total: number;
  open: number;
  remediated: number;
  closed: number;
}

export function findingProgress(findings: readonly Finding[]): FindingProgress {
  const out = { total: findings.length, open: 0, remediated: 0, closed: 0 };
  for (const f of findings) {
    const s = f.status.toLowerCase();
    if (OPEN.has(s)) out.open++;
    else if (s === "remediated") out.remediated++;
    else if (s === "closed") out.closed++;
  }
  return out;
}

/* ---------- Perlu tindakan ---------- */

export interface PmItem extends BaseWorkItem {
  findings: FindingProgress | null;
}

/**
 * Semua proyek aktif PM. Giliran PM lebih dulu. Tanggal acuan = akhir tahap
 * yang sedang berjalan (siapa pun pemegangnya), karena PM memantau semuanya.
 */
export function pmQueue(
  projects: readonly Project[],
  details: ReadonlyMap<number, ProjectDetail>,
  reports: ReadonlyMap<number, ProjectReport>,
  today = todayIso(),
): PmItem[] {
  return projects
    .filter((p) => statusOf(p) !== "Done")
    .map((project) => {
      const base = stageSchedule({ project, detail: details.get(project.project_id), myTurn: true }, today);
      const report = reports.get(project.project_id);
      return {
        ...base,
        myTurn: isPmTurn(project),
        findings: report ? findingProgress(report.findings) : null,
      };
    })
    .sort(byPriority);
}
