import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { listCatalog } from "@/entities/catalog";
import { ApplicationFindingFields, applicationFindingSchema, applicationFindingInput, findingKind, FindingDetails } from "@/entities/finding";
import {
  changeFindingStatus,
  NetworkFindingFields,
  networkFindingSchema,
  networkFindingInput,
  canEditFindingStatus,
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

// Pencatatan dan penyuntingan findings tersedia di setiap stage proyek.
const EDITABLE_STATUSES = ["Draft", "Scoping", "Assessment", "Analysis", "Initial Report", "Remediasi", "Retesting", "Final Report Drafting", "Final Presentation", "Done"];
const selectClass = "h-10 w-full rounded-sm border border-border-control bg-surface px-3 text-input text-ink focus-ring";
const editSchema = z.object({
  ...networkFindingSchema.shape,
  ...applicationFindingSchema.shape,
  status: z.enum(FINDING_STATUSES),
  status_note: z.string().max(500),
  catalog_vulna_id: z.string(),
  finding_code: z
    .string()
    .trim()
    .max(30, "Kode maksimal 30 karakter")
    .refine((v) => v === "" || /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(v), "Hanya huruf, angka, titik, garis bawah, dan strip"),
  custom_title: z.string().trim().min(1, "Judul wajib diisi").max(255, "Judul maksimal 255 karakter"),
  severity: z.enum(SEVERITIES),
  cvss_score: z.string().trim().max(2000, "CVSS maksimal 2000 karakter"),
  endpoint: z.string(),
}).superRefine((v, ctx) => {
  if (v.status === "closed_with_note" && !v.status_note.trim()) ctx.addIssue({ code: "custom", path: ["status_note"], message: "Isi alasan finding ditutup dengan catatan" });
});
type EditValues = z.infer<typeof editSchema>;

const STATUS_LABEL: Record<string, string> = { open: "Terbuka", closed: "Ditutup", closed_with_note: "Ditutup dengan catatan" };

// BE: hanya pentester dan technical writer yang mengubah status temuan; PM dan Tech Lead cuma melihat.

export function allowedFindingStatuses(f: Finding, projectStatus: string, role: string): FindingStatus[] {
  if (canEditFindingStatus(role, projectStatus)) {
    return [...FINDING_STATUSES];
  }
  return FINDING_STATUSES.includes(f.status as FindingStatus) ? [f.status as FindingStatus] : ["open"];
}

function StatusSelect({ f, options, onNeedNote }: { f: Finding; options: FindingStatus[]; onNeedNote: () => void }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (to: FindingStatus) => changeFindingStatus(f.vulna_id, to),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["findings", f.project_id] });
      notify.success("Status finding diperbarui", { description: STATUS_LABEL[r.status] ?? r.status });
    },
    onError: (e) => notify.info("Status belum bisa diubah", { description: e.message }),
  });
  if (options.length <= 1) {
    return <Badge variant="count">{STATUS_LABEL[f.status] ?? f.status}</Badge>;
  }
  return (
    <select
      aria-label={`Status finding ${f.custom_title}`}
      className="h-9 rounded-sm border border-border-control bg-surface px-2.5 text-caption text-ink focus-ring"
      value={f.status}
      disabled={m.isPending}
      onChange={(e) => {
        const next = e.target.value as FindingStatus;
        if (next === f.status) return;
        // "Ditutup dengan catatan" butuh alasan dulu, jadi buka form catatan, bukan langsung simpan.
        if (next === "closed_with_note") onNeedNote();
        else m.mutate(next);
      }}
    >
      {options.map((st) => (
        <option key={st} value={st}>{STATUS_LABEL[st] ?? st}</option>
      ))}
    </select>
  );
}

/** Form "Ditutup dengan catatan": alasan wajib diisi (BE juga menolak kalau kosong). */
function NoteEditor({ f, onDone }: { f: Finding; onDone: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState(f.status_note ?? "");
  const empty = text.trim() === "";
  const save = useMutation({
    mutationFn: () => changeFindingStatus(f.vulna_id, "closed_with_note", text.trim()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["findings", f.project_id] });
      notify.success("Finding ditutup dengan catatan");      onDone();
    },
    onError: (e) => notify.info("Belum bisa disimpan", { description: e.message }),
  });
  return (
    <form
      className="mt-3 flex w-full flex-col gap-2 rounded-sm border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!empty) save.mutate();
      }}
    >
      <Field label="Kenapa finding ini ditutup tanpa diperbaiki?" helper="Wajib diisi. Contoh: klien menerima risikonya, atau perbaikannya belum bisa dilakukan. Maksimal 500 karakter.">
        {(x) => <Textarea rows={3} maxLength={500} {...x} value={text} onChange={(e) => setText(e.target.value)} />}
      </Field>
      <div className="flex gap-2">
        <Button type="submit" variant="solid" loading={save.isPending} disabled={empty}>Simpan</Button>
        <Button type="button" onClick={onDone}>Batal</Button>
      </div>
    </form>
  );
}

function EditFinding({ f, onDone, asset, projectStatus }: { f: Finding; onDone: () => void; asset?: ProjectDetail["assets"][number]; projectStatus: string }) {
  const qc = useQueryClient();
  const kind = findingKind(asset?.asset_type);
  const network = kind === "network";
  const application = kind === "mobile" || kind === "application";
  const detailed = network || application;
  const role = useSession((s) => s.user?.role?.role_name ?? "");
  const canEditCode = role === "technical_writer";
  const catalog = useQuery({ queryKey: ["catalog", "approved"], queryFn: () => listCatalog({ status: "approved" }) });
  const approvedCatalog = (catalog.data ?? []).filter((c) => !c.status || c.status === "approved");
  const { register, handleSubmit, watch, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      ...networkFindingInput(f),
      ...applicationFindingInput(f, kind),
      app_name: f.app_name || asset?.asset_name || "",
      ip_domain: f.ip_domain || asset?.domain || asset?.ip_address || "",
      device_name: f.device_name || asset?.asset_name || "",
      ip_address: f.ip_address || asset?.ip_address || "",
      status: f.status as EditValues["status"],
      status_note: f.status_note ?? "",
      catalog_vulna_id: f.catalog_vulna_id == null ? "" : String(f.catalog_vulna_id),
      finding_code: f.finding_code ?? "",
      custom_title: f.custom_title,
      severity: f.severity as EditValues["severity"],
      cvss_score: f.cvss_score != null ? String(f.cvss_score) : "",
      endpoint: f.endpoint ?? "",
    },
  });
  const watchStatus = watch("status");
  const save = useMutation({
    mutationFn: async (v: EditValues) => {
      await updateFinding(f.vulna_id, {
        ...(network ? networkFindingInput(v) : application ? applicationFindingInput(v, kind) : {}),
        ...(detailed ? {
          status: v.status !== f.status ? v.status : undefined,
          status_note: v.status === "closed_with_note" && (v.status_note !== (f.status_note ?? "") || v.status !== f.status) ? v.status_note : undefined,
        } : {}),
        catalog_vulna_id: v.catalog_vulna_id && Number(v.catalog_vulna_id) !== f.catalog_vulna_id ? Number(v.catalog_vulna_id) : undefined,
        finding_code: canEditCode ? v.finding_code || undefined : undefined,
        custom_title: v.custom_title,
        severity: v.severity,
        cvss_score: v.cvss_score,
        endpoint: v.endpoint,
      });
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["findings", f.project_id] }); notify.success("Finding diperbarui"); onDone(); },
  });
  return (
    <form noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="mt-3 flex w-full flex-col gap-3 rounded-sm border border-border p-4">
      {save.error ? <Alert tone="error" title="Gagal menyimpan perubahan" compact>{save.error.message}</Alert> : null}
      {catalog.error ? <Alert tone="error" title="Gagal memuat category" compact>{catalog.error.message}</Alert> : null}
      {application ? <ApplicationFindingFields section="identity" mobile={kind === "mobile"} register={register} errors={errors} /> : null}
      <Field label="Category" helper="Pilih kategori dari master catalog. Judul finding diisi secara terpisah.">
        {(x) => (
          <select className={selectClass} disabled={catalog.isLoading || save.isPending} {...x} {...register("catalog_vulna_id")}>
            <option value="" disabled={Boolean(f.catalog_vulna_id)}>Tanpa category</option>
            {f.catalog_vulna_id && !approvedCatalog.some((c) => c.vulna_id === f.catalog_vulna_id) ? (
              <option value={f.catalog_vulna_id}>Category saat ini (#{f.catalog_vulna_id})</option>
            ) : null}
            {approvedCatalog.map((c) => <option key={c.vulna_id} value={c.vulna_id}>{c.title} ({c.severity})</option>)}
          </select>
        )}
      </Field>
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <Field label={network ? "Findings Code" : "Kode finding"} error={errors.finding_code?.message} helper={!canEditCode ? "Kode finding hanya dapat diubah oleh Technical Writer." : undefined}>{(x) => <Input autoComplete="off" readOnly={!canEditCode} {...x} {...register("finding_code")} />}</Field>
        <Field label={detailed ? "Vulnerability Name" : "Judul finding"} error={errors.custom_title?.message}>{(x) => <Input {...x} {...register("custom_title")} />}</Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Severity">{(x) => <select className={selectClass} {...x} {...register("severity")}>{SEVERITIES.map((v) => <option key={v} value={v}>{v}</option>)}</select>}</Field>
        <Field label={detailed ? "CVSS" : "CVSS score"} helper="Bisa diisi skor beserta vector/matrix CVSS." error={errors.cvss_score?.message}>{(x) => <Input type="text" maxLength={2000} placeholder="8.1 — CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N" {...x} {...register("cvss_score")} />}</Field>
      </div>
      {detailed ? <>
        <Field label="Status Pentest">{(x) => <select {...x} className={selectClass} {...register("status")}>
          {allowedFindingStatuses(f, projectStatus, role).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>}</Field>
        {watchStatus === "closed_with_note" ? <Field label="Alasan penutupan" error={errors.status_note?.message}>{(x) => <Textarea {...x} maxLength={500} {...register("status_note")} readOnly={!canEditFindingStatus(role, projectStatus)} />}</Field> : null}
        {network ? <NetworkFindingFields register={register} errors={errors} /> : <ApplicationFindingFields section="details" mobile={kind === "mobile"} register={register} errors={errors} />}
      </> : <Field label="Endpoint">{(x) => <Input {...x} {...register("endpoint")} />}</Field>}
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
  // Pencatatan tersedia di seluruh stage; perubahan status finding mengikuti aturan terpisah.
  const canRecord = statusOpen && ["pentester", "super_admin"].includes(role);
  const projectStatus = project.status?.status_name ?? "";
  const isOwner = (f: Finding) => f.pentester_id === user?.sys_user_id;
  const canEdit = (f: Finding) =>
    statusOpen && (["super_admin", "tech_lead", "technical_writer"].includes(role) || (role === "pentester" && isOwner(f)));
  // Catatan hanya ada di status "Ditutup dengan catatan"; yang boleh mengubah status juga boleh mengubah catatannya.
  const canNote = (f: Finding) => f.status === "closed_with_note" && allowedFindingStatuses(f, projectStatus, role).length > 1;
  const canDelete = (f: Finding) =>
    ["Assessment", "Retesting"].includes(projectStatus) && (["super_admin", "tech_lead"].includes(role) || (role === "pentester" && isOwner(f)));
  const remove = useMutation({
    mutationFn: (id: number) => deleteFinding(id),
    onSuccess: () => {
      setConfirmDeleteId(null);
      void qc.invalidateQueries({ queryKey: ["findings", project.project_id] });
      notify.success("Finding dihapus");
    },
    onError: (e) => notify.info("Finding belum bisa dihapus", { description: e.message }),
  });
  const { data, isLoading, error } = useQuery({
    queryKey: ["findings", project.project_id],
    queryFn: () => listFindings(project.project_id),
  });

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-6" aria-labelledby="findings">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="findings" className="text-title-md text-ink">Findings <span className="text-body-sm text-ink-muted">({data?.length ?? 0})</span></h2>
        {canRecord ? (
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild>
              <Button type="button" variant="solid" leadingIcon={<Plus />}>Tambah finding</Button>
            </DialogTrigger>
            <DialogContent size="lg" className="max-h-[90dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah finding</DialogTitle>
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
      {error ? <Alert tone="error" title="Gagal memuat findings" compact>{error.message}</Alert> : null}
      {isLoading ? <Skeleton className="h-24" /> : (data ?? []).length === 0 ? (
        <p className="text-body-sm text-ink-muted">Belum ada findings tercatat.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {(data ?? []).map((f) => (
            <li key={f.vulna_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="flex min-w-0 max-w-full flex-col">
                <span className="flex flex-wrap items-baseline gap-2">
                  {f.finding_code ? <code className="rounded-xs bg-surface-sunken px-1.5 py-0.5 text-caption text-ink-secondary tabular">{f.finding_code}</code> : null}
                  <span className="text-title-sm text-ink">{f.custom_title}</span>
                </span>
                <span className="break-words whitespace-pre-wrap text-body-sm text-ink-muted">
                  {f.asset?.asset_name ?? `Asset ${f.asset_id}`}{f.endpoint ? ` · ${f.endpoint}` : ""}{f.cvss_score?.trim() ? ` · CVSS ${f.cvss_score}` : ""}
                </span>
                {f.status_note ? <span className="mt-1 text-body-sm text-ink-secondary">Catatan: {f.status_note}</span> : null}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={toSeverityKey(f.severity)} />
                <StatusSelect f={f} options={allowedFindingStatuses(f, projectStatus, role)} onNeedNote={() => setNotingId(f.vulna_id)} />
                {canNote(f) && notingId !== f.vulna_id ? (
                  <Button type="button" onClick={() => setNotingId(f.vulna_id)}>Ubah catatan</Button>
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
                      aria-label={`Hapus finding ${f.custom_title}`}
                      onClick={() => setConfirmDeleteId(f.vulna_id)}
                    >
                      <Trash2 />
                    </Button>
                  )
                )}
              </span>
              {editingId !== f.vulna_id ? <FindingDetails finding={f} assetType={f.asset?.asset_type ?? project.assets.find((a) => a.assets_id === f.asset_id)?.asset_type} /> : null}
              {(f.evidences ?? []).some((evidence) => evidence.s3_bucket === "local") ? (
                <div className="flex w-full flex-wrap gap-2" aria-label={`Evidence ${f.custom_title}`}>
                  {(f.evidences ?? []).filter((evidence) => evidence.s3_bucket === "local").map((evidence) => <EvidencePhoto key={evidence.evidence_id} evidence={evidence} />)}
                </div>
              ) : null}
              {notingId === f.vulna_id ? <NoteEditor f={f} onDone={() => setNotingId(null)} /> : null}
              {editingId === f.vulna_id ? (
                <EditFinding f={f} asset={f.asset ?? project.assets.find((a) => a.assets_id === f.asset_id)} projectStatus={projectStatus} onDone={() => setEditingId(null)} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
