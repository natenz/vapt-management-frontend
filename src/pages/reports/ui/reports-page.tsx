import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Building2,
  CalendarRange,
  Download,
  FileText,
  FolderKanban,
  ShieldAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { groupByAsset } from "../model/report-views";
import { Tabs, TabsContent, TabsList, TabChip } from "@/shared/ui/tabs";
import { downloadReportDocx, getReport, SeverityBadge, SEVERITIES, type ProjectReport } from "@/entities/finding";
import { listProjects, ProjectStatusBadge, statusBetween, type Project } from "@/entities/project";
import { useSession } from "@/entities/session";
import { fmtDate, fmtRange, toSeverityKey } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { DataTable } from "@/shared/ui/data-table";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  EMPTY_REPORT_FILTERS,
  PAGE_SIZE_OPTIONS,
  applyReportFilters,
  getReportStatusOptions,
  hasAnyFilter,
  parsePageSize,
  parseReportFilters,
  writePageSize,
  writeReportFilters,
  type ReportFilters,
} from "../model/report-filters";
import { ReportsFilterBar } from "./reports-filter-bar";
import { ReportPreview } from "./report-preview";

/** Daftar seluruh projects yang laporannya bisa dibuka oleh pengguna. */
export function ReportsIndexPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isProjectManager = useSession((state) => state.user?.role?.role_name === "project_manager");
  const isTechnicalWriter = useSession((state) => state.user?.role?.role_name === "technical_writer");
  const filters = useMemo(() => parseReportFilters(searchParams), [searchParams]);
  const pageSize = parsePageSize(searchParams);

  const setFilters = (next: ReportFilters) =>
    setSearchParams((prev) => writeReportFilters(next, prev), { replace: true });
  const setPageSize = (next: number) =>
    setSearchParams((prev) => writePageSize(next, prev), { replace: true });

  const { data, isLoading, error } = useQuery({
    queryKey: ["projects", "all"],
    queryFn: () => listProjects({ limit: 100 }),
  });

  const allRows = useMemo(
    () => (data?.data ?? []).filter((p) =>
      isTechnicalWriter || statusBetween(p.status?.status_name, "Initial Report", "Done"),
    ),
    [data, isTechnicalWriter],
  );

  const filteredRows = useMemo(
    () => applyReportFilters(allRows, filters),
    [allRows, filters],
  );
  const statusOptions = useMemo(() => getReportStatusOptions(allRows), [allRows]);
  const isFiltered = hasAnyFilter(filters);

  const columns = useMemo<ColumnDef<Project>[]>(
    () => [
      {
        accessorKey: "project_name",
        header: () => (
          <span className="inline-flex items-center gap-1.5 font-normal normal-case">
            <FolderKanban className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
            <span>Proyek</span>
          </span>
        ),
        cell: ({ row }) => (
          <Link
            to={`/projects/${row.original.project_id}/report`}
            className="rounded-xs text-title-sm font-normal text-ink focus-ring hover:text-brand"
          >
            {row.original.project_name}
          </Link>
        ),
      },
      {
        accessorKey: "client_name",
        header: () => (
          <span className="inline-flex items-center gap-1.5 font-normal normal-case">
            <Building2 className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
            <span>Klien</span>
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-body-sm text-ink-secondary">{row.original.client_name ?? "-"}</span>
        ),
      },
      {
        id: "range",
        header: () => (
          <span className="inline-flex items-center gap-1.5 font-normal normal-case">
            <CalendarRange className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
            <span>Rentang tanggal</span>
          </span>
        ),
        enableSorting: false,
        cell: ({ row }) => fmtRange(row.original.start_date, row.original.end_date),
      },
      {
        id: "status",
        header: () => (
          <span className="inline-flex items-center gap-1.5 font-normal normal-case">
            <ShieldAlert className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
            <span>Status</span>
          </span>
        ),
        cell: ({ row }) => <ProjectStatusBadge name={row.original.status?.status_name} />,
      },
      {
        id: "actions",
        header: () => (
          <span className="inline-flex items-center gap-1.5 font-normal normal-case">
            <FileText className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
            <span>Aksi</span>
          </span>
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <Button asChild variant="quiet" className="h-8 px-2.5 text-xs text-brand hover:text-brand">
            <Link to={`/projects/${row.original.project_id}/report`}>Buka Report</Link>
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isProjectManager ? "Reports" : "Koreksi & Report"}
        description={isProjectManager ? undefined : isTechnicalWriter ? "Projects yang bisa kamu buka." : "Proyek yang sudah masuk stage Initial Report atau sesudahnya."}
      />
      {error ? <Alert tone="error" title="Gagal memuat">{error.message}</Alert> : null}

      <div className="flex flex-col gap-4">
        <ReportsFilterBar
          filters={filters}
          onChange={setFilters}
          statusOptions={statusOptions}
          resultCount={filteredRows.length}
          totalCount={allRows.length}
        />

        <DataTable
          columns={columns}
          data={filteredRows}
          noun="reports"
          caption="Daftar report proyek"
          isLoading={isLoading}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={setPageSize}
          getRowId={(p) => String(p.project_id)}
          onRowClick={(p) => navigate(`/projects/${p.project_id}/report`)}
          getRowAriaLabel={(p) => `Buka report ${p.project_name}`}
          emptyState={
            isFiltered ? (
              <EmptyState
                icon={<FileText />}
                title="Tidak ada report yang cocok"
                description="Coba ubah kata kunci atau kurangi filter status."
                action={
                  <Button variant="quiet" onClick={() => setFilters(EMPTY_REPORT_FILTERS)}>
                    Reset filter
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<FileText />}
                title="Belum ada report"
                description={isTechnicalWriter ? "Belum ada projects yang bisa ditampilkan." : "Proyek akan muncul di sini setelah masuk stage Initial Report."}
              />
            )
          }
        />
      </div>
    </div>
  );
}

function FindingItem({ f, showAsset }: { f: ProjectReport["findings"][number]; showAsset: boolean }) {
  return (
    <li className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-baseline gap-2">
          {f.finding_code ? <code className="rounded-xs bg-surface-sunken px-1.5 py-0.5 text-caption text-ink-secondary tabular">{f.finding_code}</code> : null}
          <span className="text-title-sm text-ink">{f.custom_title}</span>
        </span>
        <SeverityBadge severity={toSeverityKey(f.severity)} />
      </div>
      <p className="text-body-sm text-ink-muted">
        {showAsset ? `${f.asset?.asset_name ?? `Asset ${f.asset_id}`} · ` : ""}{f.endpoint ? `${f.endpoint} · ` : ""}{f.cvss_score != null ? `CVSS ${f.cvss_score} · ` : ""}{f.status}
      </p>
      {(f.evidences ?? []).length ? (
        <p className="text-caption text-ink-muted">Evidence: {(f.evidences ?? []).map((e) => e.file_name).join(", ")}</p>
      ) : null}
    </li>
  );
}

/** Tampilkan data laporan dan aksi DOCX untuk proyek maupun asset. */
export function ReportPage() {
  const { projectId } = useParams();
  const id = Number(projectId);
  const { data, isLoading, error } = useQuery({ queryKey: ["report", id], queryFn: () => getReport(id) });
  const [downloadingAssetId, setDownloadingAssetId] = useState<number | null | undefined>(undefined);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const downloadDocx = async (assetId?: number) => {
    setDownloadingAssetId(assetId ?? null);
    setDownloadError(null);
    try {
      const blob = await downloadReportDocx(id, assetId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = assetId ? `initial-report-asset-${assetId}.docx` : `initial-report-project-${id}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setDownloadError(cause instanceof Error ? cause.message : "Report DOCX tidak dapat diunduh");
    } finally {
      setDownloadingAssetId(undefined);
    }
  };

  if (isLoading) return <Skeleton className="h-96" />;
  if (error || !data) return <Alert tone="error" title="Report tidak tersedia">{error?.message}</Alert>;
  const perAsset = groupByAsset(data, SEVERITIES);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Report: ${data.project.project_name}`}
        description={`${fmtRange(data.project.start_date, data.project.end_date)} · dibuat ${fmtDate(data.generated_at)}`}
        action={
          <div className="flex flex-wrap gap-2">
            <ReportPreview projectId={id} name={data.project.project_name} />
            <Button onClick={() => void downloadDocx()} disabled={downloadingAssetId !== undefined} leadingIcon={<Download />}>
              {downloadingAssetId === null ? "Menyiapkan DOCX..." : "Unduh DOCX"}
            </Button>
          </div>
        }
      />
      {downloadError ? <Alert tone="error" title="Unduh report gagal">{downloadError}</Alert> : null}
      <section className="flex flex-wrap gap-2" aria-label="Ringkasan severity">
        {SEVERITIES.map((s) => (
          <SeverityBadge key={s} severity={toSeverityKey(s)} count={data.summary.by_severity?.[s] ?? 0} />
        ))}
        <span className="self-center text-body-sm text-ink-muted">Total {data.summary.total_findings} findings</span>
      </section>
      <Tabs defaultValue="project" className="flex flex-col gap-4">
        <TabsList aria-label="Jenis report">
          <TabChip value="project" count={data.findings.length}>Report Proyek</TabChip>
          <TabChip value="asset" count={perAsset.length}>Report per Asset</TabChip>
        </TabsList>
        <TabsContent value="project">
          <ul className="flex flex-col gap-3">
            {data.findings.length === 0 ? <li className="text-body-sm text-ink-muted">Belum ada findings.</li> : null}
            {data.findings.map((f) => (<FindingItem key={f.vulna_id} f={f} showAsset />))}
          </ul>
        </TabsContent>
        <TabsContent value="asset" className="flex flex-col gap-6">
          {perAsset.length === 0 ? <p className="text-body-sm text-ink-muted">Proyek ini belum punya asset.</p> : null}
          {perAsset.map(({ asset, findings, bySeverity }) => (
            <section key={asset.assets_id} aria-label={`Report asset ${asset.asset_name}`} className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5">
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
              <div className="flex flex-wrap gap-2">
                <ReportPreview projectId={id} assetId={asset.assets_id} name={asset.asset_name} />
                <Button
                  variant="outline"
                  onClick={() => void downloadDocx(asset.assets_id)}
                  disabled={downloadingAssetId !== undefined}
                  leadingIcon={<Download />}
                >
                  {downloadingAssetId === asset.assets_id ? "Menyiapkan DOCX..." : "Unduh DOCX asset"}
                </Button>
              </div>
              <ul className="flex flex-col gap-3">
                {findings.length === 0 ? <li className="text-body-sm text-ink-muted">Tidak ada findings pada asset ini.</li> : null}
                {findings.map((f) => (<FindingItem key={f.vulna_id} f={f} showAsset={false} />))}
              </ul>
            </section>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
