import { useQuery } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { Link, useParams } from "react-router";
import { getReport } from "@/entities/finding/api";
import { listProjects } from "@/entities/project/api";
import { fmtDate, fmtRange, toSeverityKey } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import { ProjectStatusBadge } from "@/shared/ui/project-status-badge";
import { SEVERITIES } from "@/shared/api/schemas";
import { SeverityBadge } from "@/shared/ui/severity-badge";
import { Skeleton } from "@/shared/ui/skeleton";

/** Daftar proyek yang laporannya bisa dibuka (tahap Reporting dan sesudahnya). */
export function ReportsIndexPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["projects", "all"], queryFn: () => listProjects({ limit: 100 }) });
  const rows = (data?.data ?? []).filter((p) => ["Reporting", "Remediation", "Retest", "Done"].includes(p.status?.status_name ?? ""));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Koreksi & Laporan" description="Proyek yang sudah masuk tahap Reporting atau sesudahnya." />
      {error ? <Alert tone="error" title="Gagal memuat">{error.message}</Alert> : null}
      {isLoading ? <Skeleton className="h-40" /> : rows.length === 0 ? (
        <EmptyState icon={<FileText />} title="Belum ada laporan" description="Proyek akan muncul di sini setelah masuk tahap Reporting." />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((p) => (
            <li key={p.project_id}>
              <Link to={`/projects/${p.project_id}/report`} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface p-4 focus-ring hover:border-border-strong">
                <span className="text-title-sm text-ink">{p.project_name}</span>
                <ProjectStatusBadge name={p.status?.status_name} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Data laporan dari GET /projects/:id/report. Generate PDF/DOCX belum ada di BE. */
export function ReportPage() {
  const { projectId } = useParams();
  const id = Number(projectId);
  const { data, isLoading, error } = useQuery({ queryKey: ["report", id], queryFn: () => getReport(id) });

  if (isLoading) return <Skeleton className="h-96" />;
  if (error || !data) return <Alert tone="error" title="Laporan tidak tersedia">{error?.message}</Alert>;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Laporan: ${data.project.project_name}`}
        description={`${fmtRange(data.project.start_date, data.project.end_date)} · dibuat ${fmtDate(data.generated_at)}`}
        action={<Button disabled leadingIcon={<Download />} title="Ekspor PDF/DOCX belum tersedia di backend">Unduh laporan</Button>}
      />
      <section className="flex flex-wrap gap-2" aria-label="Ringkasan severity">
        {SEVERITIES.map((s) => (
          <SeverityBadge key={s} severity={toSeverityKey(s)} count={data.summary.by_severity?.[s] ?? 0} />
        ))}
        <span className="self-center text-body-sm text-ink-muted">Total {data.summary.total_findings} temuan</span>
      </section>
      <ul className="flex flex-col gap-3">
        {data.findings.map((f) => (
          <li key={f.vulna_id} className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-title-sm text-ink">{f.custom_title}</span>
              <SeverityBadge severity={toSeverityKey(f.severity)} />
            </div>
            <p className="text-body-sm text-ink-muted">
              {f.asset?.asset_name} {f.endpoint ? `· ${f.endpoint}` : ""} {f.cvss_score != null ? `· CVSS ${f.cvss_score}` : ""} · {f.status}
            </p>
            {(f.evidences ?? []).length ? (
              <p className="text-caption text-ink-muted">Evidence: {(f.evidences ?? []).map((e) => e.file_name).join(", ")}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
