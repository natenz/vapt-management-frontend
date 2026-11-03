import { useQuery } from "@tanstack/react-query";
import { listFindings } from "@/entities/finding/api";
import type { ProjectDetail } from "@/shared/api/schemas";
import { toSeverityKey } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { SeverityBadge } from "@/shared/ui/severity-badge";
import { SEVERITIES } from "@/shared/api/schemas";
import { Skeleton } from "@/shared/ui/skeleton";

export function FindingsPanel({ project }: { project: ProjectDetail }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["findings", project.project_id],
    queryFn: () => listFindings(project.project_id),
  });

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-6" aria-labelledby="findings">
      <h2 id="findings" className="text-title-md text-ink">Temuan <span className="text-body-sm text-ink-muted">({data?.length ?? 0})</span></h2>
      {(data ?? []).length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label="Ringkasan severity">
          {SEVERITIES.map((s) => {
            const n = (data ?? []).filter((x) => x.severity.toLowerCase() === s.toLowerCase()).length;
            return n > 0 ? <SeverityBadge key={s} severity={toSeverityKey(s)} count={n} /> : null;
          })}
        </div>
      ) : null}
      {error ? <Alert tone="error" title="Gagal memuat temuan" compact>{error.message}</Alert> : null}
      {isLoading ? <Skeleton className="h-24" /> : (data ?? []).length === 0 ? (
        <p className="text-body-sm text-ink-muted">Belum ada temuan tercatat.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {(data ?? []).map((f) => (
            <li key={f.vulna_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="flex flex-col">
                <span className="text-title-sm text-ink">{f.custom_title}</span>
                <span className="text-body-sm text-ink-muted">
                  {f.asset?.asset_name ?? `Aset ${f.asset_id}`}{f.endpoint ? ` · ${f.endpoint}` : ""}{f.cvss_score != null ? ` · CVSS ${f.cvss_score}` : ""}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <SeverityBadge severity={toSeverityKey(f.severity)} />
                <Badge variant="count">{f.status}</Badge>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
