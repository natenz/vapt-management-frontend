import { useQuery } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { Link, useParams } from "react-router";
import { groupByAsset } from "../model/report-views";
import { Tabs, TabsContent, TabsList, TabChip } from "@/shared/ui/tabs";
import { getReport, SeverityBadge, SEVERITIES, type ProjectReport } from "@/entities/finding";
import { listProjects, ProjectStatusBadge } from "@/entities/project";
import { fmtDate, fmtRange, toSeverityKey } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";

/** Daftar proyek yang laporannya bisa dibuka (tahap Reporting dan sesudahnya). */
export function ReportsIndexPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["projects", "all"], queryFn: () => listProjects({ limit: 100 }) });
  const rows = (data?.data ?? []).filter((p) => ["Reporting", "Remediation", "Retest", "Final Report", "Done"].includes(p.status?.status_name ?? ""));
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

function FindingItem({ f, showAsset }: { f: ProjectReport["findings"][number]; showAsset: boolean }) {
  return (
    <li className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-title-sm text-ink">{f.custom_title}</span>
        <SeverityBadge severity={toSeverityKey(f.severity)} />
      </div>
      <p className="text-body-sm text-ink-muted">
        {showAsset ? `${f.asset?.asset_name ?? `Aset ${f.asset_id}`} · ` : ""}{f.endpoint ? `${f.endpoint} · ` : ""}{f.cvss_score != null ? `CVSS ${f.cvss_score} · ` : ""}{f.status}
      </p>
      {(f.evidences ?? []).length ? (
        <p className="text-caption text-ink-muted">Evidence: {(f.evidences ?? []).map((e) => e.file_name).join(", ")}</p>
      ) : null}
    </li>
  );
}

/** Data laporan dari GET /projects/:id/report. Generate PDF/DOCX belum ada di BE. */
export function ReportPage() {
  const { projectId } = useParams();
  const id = Number(projectId);
  const { data, isLoading, error } = useQuery({ queryKey: ["report", id], queryFn: () => getReport(id) });

  if (isLoading) return <Skeleton className="h-96" />;
  if (error || !data) return <Alert tone="error" title="Laporan tidak tersedia">{error?.message}</Alert>;
  const perAsset = groupByAsset(data, SEVERITIES);

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
      <Tabs defaultValue="project" className="flex flex-col gap-4">
        <TabsList aria-label="Jenis laporan">
          <TabChip value="project" count={data.findings.length}>Laporan Proyek</TabChip>
          <TabChip value="asset" count={perAsset.length}>Laporan per Aset</TabChip>
        </TabsList>
        <TabsContent value="project">
          <ul className="flex flex-col gap-3">
            {data.findings.length === 0 ? <li className="text-body-sm text-ink-muted">Belum ada temuan.</li> : null}
            {data.findings.map((f) => (<FindingItem key={f.vulna_id} f={f} showAsset />))}
          </ul>
        </TabsContent>
        <TabsContent value="asset" className="flex flex-col gap-6">
          {perAsset.length === 0 ? <p className="text-body-sm text-ink-muted">Proyek ini belum punya aset.</p> : null}
          {perAsset.map(({ asset, findings, bySeverity }) => (
            <section key={asset.assets_id} aria-label={`Laporan aset ${asset.asset_name}`} className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5">
              <header className="flex flex-wrap items-start justify-between gap-2">
                <span className="flex flex-col">
                  <h2 className="text-title-md text-ink">{asset.asset_name}</h2>
                  <span className="text-body-sm text-ink-muted">
                    {asset.asset_type} · {asset.domain || asset.ip_address || "-"} · {asset.mandays} md · {asset.pentester?.profile?.full_name ?? asset.pentester?.username ?? "belum ada pentester"}
                  </span>
                </span>
                <span className="flex flex-wrap gap-2">
                  {SEVERITIES.map((s) => (<SeverityBadge key={s} severity={toSeverityKey(s)} count={bySeverity[s] ?? 0} />))}
                </span>
              </header>
              <ul className="flex flex-col gap-3">
                {findings.length === 0 ? <li className="text-body-sm text-ink-muted">Tidak ada temuan pada aset ini.</li> : null}
                {findings.map((f) => (<FindingItem key={f.vulna_id} f={f} showAsset={false} />))}
              </ul>
            </section>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
