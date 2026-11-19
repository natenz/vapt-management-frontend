import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  changeFindingStatus,
  deleteFinding,
  listFindings,
  updateFinding,
  FINDING_STATUSES,
  SeverityBadge,
  EvidencePhoto,
  SEVERITIES,
  type Finding,
  type FindingStatus,
} from "@/entities/finding";
import { useSession } from "@/entities/session";
import type { ProjectDetail } from "@/entities/project";
import { CreateFindingForm } from "@/features/create-finding";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Field, Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { notify } from "@/shared/ui/toast";
import { toSeverityKey } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";

// BE (vulna_service.Update): admin/TL, technical_writer, atau pentester pemilik; terkunci saat Remediasi, terbuka lagi saat Retesting.
const EDITABLE_STATUSES = ["Assessment", "Analysis", "Initial Report", "Retesting", "Final Report Drafting"];
const selectClass = "h-10 w-full rounded-sm border border-border-control bg-surface px-3 text-input text-ink focus-ring";
const editSchema = z.object({
  finding_code: z
    .string()
    .trim()
    .max(30, "Kode maksimal 30 karakter")
    .refine((v) => v === "" || /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(v), "Hanya huruf, angka, titik, garis bawah, dan strip"),
  custom_title: z.string().trim().min(1, "Judul wajib diisi").max(255, "Judul maksimal 255 karakter"),
  severity: z.enum(SEVERITIES),
  cvss_score: z.string().refine((v) => v === "" || (Number(v) >= 0 && Number(v) <= 10), "CVSS 0 sampai 10"),
  endpoint: z.string(),
  status: z.enum(FINDING_STATUSES),
});
type EditValues = z.infer<typeof editSchema>;

const STATUS_LABEL: Record<string, string> = { open: "Terbuka", closed: "Ditutup" };

export function allowedFindingStatuses(
  f: Finding,
  projectStatus: string,
  role: string,
  canManage: boolean,
): FindingStatus[] {
  if (EDITABLE_STATUSES.includes(projectStatus) && (canManage || role === "pentester")) {
    return [...FINDING_STATUSES];
  }
  return FINDING_STATUSES.includes(f.status as FindingStatus) ? [f.status as FindingStatus] : ["open"];
}

function StatusSelect({ f, options }: { f: Finding; options: FindingStatus[] }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (to: FindingStatus) => changeFindingStatus(f.vulna_id, to),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["findings", f.project_id] });
      notify.success("Status temuan diperbarui", { description: STATUS_LABEL[r.status] ?? r.status });
    },
    onError: (e) => notify.info("Status belum bisa diubah", { description: e.message }),
  });
  if (options.length <= 1) {
    return <Badge variant="count">{STATUS_LABEL[f.status] ?? f.status}</Badge>;
  }
  return (
    <select
      aria-label={`Status temuan ${f.custom_title}`}
      className="h-9 rounded-sm border border-border-control bg-surface px-2.5 text-caption text-ink focus-ring"
      value={f.status}
      disabled={m.isPending}
      onChange={(e) => {
        const next = e.target.value as FindingStatus;
        if (next !== f.status) m.mutate(next);
      }}
    >
      {options.map((st) => (
        <option key={st} value={st}>{STATUS_LABEL[st] ?? st}</option>
      ))}
    </select>
  );
}

/** Catatan status: alasan temuan masih terbuka (mis. klien tidak mau memperbaiki). */
function NoteEditor({ f, onDone }: { f: Finding; onDone: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState(f.status_note ?? "");
  const save = useMutation({
    mutationFn: () => changeFindingStatus(f.vulna_id, f.status as FindingStatus, text.trim()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["findings", f.project_id] });
      notify.success("Catatan temuan tersimpan");
      onDone();
    },
    onError: (e) => notify.info("Catatan belum bisa disimpan", { description: e.message }),
  });
  return (
    <form
      className="mt-3 flex w-full flex-col gap-2 rounded-sm border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <Field label="Catatan status" helper="Contoh: klien tidak mau memperbaiki, atau memang harus tetap terbuka. Maksimal 500 karakter.">
        {(x) => <Textarea rows={3} maxLength={500} {...x} value={text} onChange={(e) => setText(e.target.value)} />}
      </Field>
      <div className="flex gap-2">
        <Button type="submit" variant="solid" loading={save.isPending}>Simpan catatan</Button>
        <Button type="button" onClick={onDone}>Batal</Button>
      </div>
    </form>
  );
}

function EditFinding({
  f,
  statusOptions,
  onDone,
}: {
  f: Finding;
  statusOptions: FindingStatus[];
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      finding_code: f.finding_code ?? "",
      custom_title: f.custom_title,
      severity: f.severity as EditValues["severity"],
      cvss_score: f.cvss_score != null ? String(f.cvss_score) : "",
      endpoint: f.endpoint ?? "",
      status: (FINDING_STATUSES.includes(f.status as FindingStatus) ? f.status : "open") as FindingStatus,
    },
  });
  const save = useMutation({
    mutationFn: async (v: EditValues) => {
      await updateFinding(f.vulna_id, {
        finding_code: v.finding_code || undefined,
        custom_title: v.custom_title,
        severity: v.severity,
        cvss_score: v.cvss_score === "" ? undefined : Number(v.cvss_score),
        endpoint: v.endpoint,
      });
      if (v.status !== f.status) {
        await changeFindingStatus(f.vulna_id, v.status);
      }
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["findings", f.project_id] }); notify.success("Temuan diperbarui"); onDone(); },
  });
  return (
    <form noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="mt-3 flex w-full flex-col gap-3 rounded-sm border border-border p-4">
      {save.error ? <Alert tone="error" title="Gagal menyimpan perubahan" compact>{save.error.message}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <Field label="Kode temuan" error={errors.finding_code?.message}>{(x) => <Input autoComplete="off" {...x} {...register("finding_code")} />}</Field>
        <Field label="Judul temuan" error={errors.custom_title?.message}>{(x) => <Input {...x} {...register("custom_title")} />}</Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Severity">{(x) => <select className={selectClass} {...x} {...register("severity")}>{SEVERITIES.map((v) => <option key={v} value={v}>{v}</option>)}</select>}</Field>
        <Field label="CVSS score" error={errors.cvss_score?.message}>{(x) => <Input type="number" step="0.1" min={0} max={10} {...x} {...register("cvss_score")} />}</Field>
        <Field label="Status temuan">
          {(x) => (
            <select className={selectClass} disabled={statusOptions.length <= 1} {...x} {...register("status")}>
              {statusOptions.map((st) => (
                <option key={st} value={st}>{STATUS_LABEL[st] ?? st}</option>
              ))}
            </select>
          )}
        </Field>
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
  const qc = useQueryClient();
  const user = useSession((u) => u.user);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [notingId, setNotingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const role = user?.role?.role_name ?? "";
  const statusOpen = EDITABLE_STATUSES.includes(project.status?.status_name ?? "");
  // Sama dengan BE (vulna_service Create): sebelum Remediasi dan lagi dari Retesting sampai Final Report Drafting.
  const canRecord = statusOpen && ["pentester", "super_admin"].includes(role);
  // BE canManage: admin/TL atau PM pemilik proyek.
  const canManage = ["super_admin", "tech_lead"].includes(role) || (role === "project_manager" && project.pm_id === user?.sys_user_id);
  const projectStatus = project.status?.status_name ?? "";
  const isOwner = (f: Finding) => f.pentester_id === user?.sys_user_id;
  const canEdit = (f: Finding) =>
    statusOpen && (["super_admin", "tech_lead", "technical_writer"].includes(role) || (role === "pentester" && isOwner(f)));
  // BE: catatan ikut jalur ubah status; saat Remediasi hanya PM pemilik/admin.
  const canNote = (f: Finding) =>
    allowedFindingStatuses(f, projectStatus, role, canManage).length > 1 || (projectStatus === "Remediasi" && canManage);
  const canDelete = (f: Finding) =>
    ["Assessment", "Retesting"].includes(projectStatus) && (["super_admin", "tech_lead"].includes(role) || (role === "pentester" && isOwner(f)));
  const remove = useMutation({
    mutationFn: (id: number) => deleteFinding(id),
    onSuccess: () => {
      setConfirmDeleteId(null);
      void qc.invalidateQueries({ queryKey: ["findings", project.project_id] });
      notify.success("Temuan dihapus");
    },
    onError: (e) => notify.info("Temuan belum bisa dihapus", { description: e.message }),
  });
  const { data, isLoading, error } = useQuery({
    queryKey: ["findings", project.project_id],
    queryFn: () => listFindings(project.project_id),
  });

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-6" aria-labelledby="findings">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="findings" className="text-title-md text-ink">Temuan <span className="text-body-sm text-ink-muted">({data?.length ?? 0})</span></h2>
        {canRecord ? (
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild>
              <Button type="button" variant="solid" leadingIcon={<Plus />}>Tambah temuan</Button>
            </DialogTrigger>
            <DialogContent size="lg" className="max-h-[90dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah temuan</DialogTitle>
                <DialogDescription>{project.project_name}</DialogDescription>
              </DialogHeader>
              <div className="mt-6">
                <CreateFindingForm project={project} onSuccess={() => setCreating(false)} onCancel={() => setCreating(false)} />
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
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
                <span className="flex flex-wrap items-baseline gap-2">
                  {f.finding_code ? <code className="rounded-xs bg-surface-sunken px-1.5 py-0.5 text-caption text-ink-secondary tabular">{f.finding_code}</code> : null}
                  <span className="text-title-sm text-ink">{f.custom_title}</span>
                </span>
                <span className="text-body-sm text-ink-muted">
                  {f.asset?.asset_name ?? `Aset ${f.asset_id}`}{f.endpoint ? ` · ${f.endpoint}` : ""}{f.cvss_score != null ? ` · CVSS ${f.cvss_score}` : ""}
                </span>
                {f.status_note ? <span className="mt-1 text-body-sm text-ink-secondary">Catatan: {f.status_note}</span> : null}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={toSeverityKey(f.severity)} />
                <StatusSelect f={f} options={allowedFindingStatuses(f, projectStatus, role, canManage)} />
                {canNote(f) && notingId !== f.vulna_id ? (
                  <Button type="button" onClick={() => setNotingId(f.vulna_id)}>{f.status_note ? "Ubah catatan" : "Catatan"}</Button>
                ) : null}
                {canEdit(f) && editingId !== f.vulna_id ? <Button type="button" onClick={() => setEditingId(f.vulna_id)}>Edit</Button> : null}
                {canDelete(f) && (
                  confirmDeleteId === f.vulna_id ? (
                    <span className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="solid"
                        loading={remove.isPending && remove.variables === f.vulna_id}
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(f.vulna_id)}
                      >
                        Yakin hapus
                      </Button>
                      <Button type="button" variant="outline" disabled={remove.isPending} onClick={() => setConfirmDeleteId(null)}>
                        Batal
                      </Button>
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="quiet"
                      aria-label={`Hapus temuan ${f.custom_title}`}
                      onClick={() => setConfirmDeleteId(f.vulna_id)}
                    >
                      <Trash2 />
                    </Button>
                  )
                )}
              </span>
              {(f.evidences ?? []).some((evidence) => evidence.s3_bucket === "local") ? (
                <div className="flex w-full flex-wrap gap-2" aria-label={`Evidence ${f.custom_title}`}>
                  {(f.evidences ?? []).filter((evidence) => evidence.s3_bucket === "local").map((evidence) => <EvidencePhoto key={evidence.evidence_id} evidence={evidence} />)}
                </div>
              ) : null}
              {notingId === f.vulna_id ? <NoteEditor f={f} onDone={() => setNotingId(null)} /> : null}
              {editingId === f.vulna_id ? (
                <EditFinding
                  f={f}
                  statusOptions={allowedFindingStatuses(f, projectStatus, role, canManage)}
                  onDone={() => setEditingId(null)}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
