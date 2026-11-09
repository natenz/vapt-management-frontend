import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  changeFindingStatus,
  listFindings,
  updateFinding,
  SeverityBadge,
  SEVERITIES,
  type Finding,
  type FindingStatus,
} from "@/entities/finding";
import { useSession } from "@/entities/session";
import type { ProjectDetail } from "@/entities/project";
import { Button } from "@/shared/ui/button";
import { Field, Input } from "@/shared/ui/input";
import { notify } from "@/shared/ui/toast";
import { toSeverityKey } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";

// BE (vulna_service.Update): admin/TL, technical_writer, atau pentester pemilik; hanya saat Pentest/Reporting/Remediation/Retest.
const EDITABLE_STATUSES = ["Pentest", "Reporting", "Remediation", "Retest"];
const selectClass = "h-10 w-full rounded-sm border border-border-control bg-surface px-3 text-input text-ink focus-ring";
const editSchema = z.object({
  custom_title: z.string().trim().min(1, "Judul wajib diisi").max(255, "Judul maksimal 255 karakter"),
  severity: z.enum(SEVERITIES),
  cvss_score: z.string().refine((v) => v === "" || (Number(v) >= 0 && Number(v) <= 10), "CVSS 0 sampai 10"),
  endpoint: z.string(),
});
type EditValues = z.infer<typeof editSchema>;

const STATUS_LABEL: Record<string, string> = { open: "Terbuka", remediated: "Sudah diperbaiki", closed: "Selesai (lolos retest)", reopened: "Masih rentan" };

export type StatusAction = { to: FindingStatus; label: string };

/**
 * Aksi status yang boleh dilakukan user ini. Cermin vulna_service.ChangeStatus (BE tetap yang menegakkan):
 * - remediated: PM pemilik proyek / TL / admin, saat Remediation atau Retest
 * - closed / reopened: pentester, TL, admin, hanya saat Retest
 */
export function statusActions(f: Finding, projectStatus: string, role: string, canManage: boolean): StatusAction[] {
  const out: StatusAction[] = [];
  const verifier = ["pentester", "tech_lead", "super_admin"].includes(role);
  if (canManage && ["Remediation", "Retest"].includes(projectStatus) && f.status !== "remediated" && f.status !== "closed") {
    out.push({ to: "remediated", label: "Tandai sudah diperbaiki" });
  }
  if (verifier && projectStatus === "Retest" && f.status === "remediated") {
    out.push({ to: "closed", label: "Lolos retest" }, { to: "reopened", label: "Masih rentan" });
  }
  return out;
}

function StatusActions({ f, actions }: { f: Finding; actions: StatusAction[] }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (to: FindingStatus) => changeFindingStatus(f.vulna_id, to),
    onSuccess: (r) => { void qc.invalidateQueries({ queryKey: ["findings", f.project_id] }); notify.success("Status temuan diperbarui", { description: STATUS_LABEL[r.status] ?? r.status }); },
    onError: (e) => notify.info("Status belum bisa diubah", { description: e.message }),
  });
  return (
    <>
      {actions.map((a) => (
        <Button key={a.to} type="button" loading={m.isPending && m.variables === a.to} disabled={m.isPending} onClick={() => m.mutate(a.to)}>{a.label}</Button>
      ))}
    </>
  );
}

function EditFinding({ f, onDone }: { f: Finding; onDone: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { custom_title: f.custom_title, severity: f.severity as EditValues["severity"], cvss_score: f.cvss_score != null ? String(f.cvss_score) : "", endpoint: f.endpoint ?? "" },
  });
  const save = useMutation({
    mutationFn: (v: EditValues) =>
      updateFinding(f.vulna_id, { custom_title: v.custom_title, severity: v.severity, cvss_score: v.cvss_score === "" ? undefined : Number(v.cvss_score), endpoint: v.endpoint }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["findings", f.project_id] }); notify.success("Temuan diperbarui"); onDone(); },
  });
  return (
    <form noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="mt-3 flex w-full flex-col gap-3 rounded-sm border border-border p-4">
      {save.error ? <Alert tone="error" title="Gagal menyimpan perubahan" compact>{save.error.message}</Alert> : null}
      <Field label="Judul temuan" error={errors.custom_title?.message}>{(x) => <Input {...x} {...register("custom_title")} />}</Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Severity">{(x) => <select className={selectClass} {...x} {...register("severity")}>{SEVERITIES.map((v) => <option key={v} value={v}>{v}</option>)}</select>}</Field>
        <Field label="CVSS score" error={errors.cvss_score?.message}>{(x) => <Input type="number" step="0.1" min={0} max={10} {...x} {...register("cvss_score")} />}</Field>
      </div>
      <Field label="Endpoint">{(x) => <Input {...x} {...register("endpoint")} />}</Field>
      <div className="flex gap-2">
        <Button type="submit" variant="solid" loading={save.isPending}>Simpan</Button>
        <Button type="button" onClick={onDone}>Batal</Button>
      </div>
    </form>
  );
}

export function FindingsPanel({ project }: { project: ProjectDetail }) {
  const user = useSession((u) => u.user);
  const [editingId, setEditingId] = useState<number | null>(null);
  const role = user?.role?.role_name ?? "";
  const statusOpen = EDITABLE_STATUSES.includes(project.status?.status_name ?? "");
  // BE canManage: admin/TL atau PM pemilik proyek.
  const canManage = ["super_admin", "tech_lead"].includes(role) || (role === "project_manager" && project.pm_id === user?.sys_user_id);
  const projectStatus = project.status?.status_name ?? "";
  const canEdit = (f: Finding) =>
    statusOpen && (["super_admin", "tech_lead", "technical_writer"].includes(role) || (role === "pentester" && f.pentester_id === user?.sys_user_id));
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
                <Badge variant="count">{STATUS_LABEL[f.status] ?? f.status}</Badge>
                <StatusActions f={f} actions={statusActions(f, projectStatus, role, canManage)} />
                {canEdit(f) && editingId !== f.vulna_id ? <Button type="button" onClick={() => setEditingId(f.vulna_id)}>Edit</Button> : null}
              </span>
              {editingId === f.vulna_id ? <EditFinding f={f} onDone={() => setEditingId(null)} /> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
