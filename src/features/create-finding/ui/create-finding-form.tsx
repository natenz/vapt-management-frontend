import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { listCatalog } from "@/entities/catalog";
import { createFinding, uploadEvidence, SEVERITIES, type Finding } from "@/entities/finding";
import type { ProjectDetail } from "@/entities/project";
import { useSession } from "@/entities/session";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Field, FieldGroup, Input } from "@/shared/ui/input";
import { notify } from "@/shared/ui/toast";

import { EvidenceUploader } from "./evidence-uploader";

const schema = z
  .object({
    asset_id: z.string().min(1, "Pilih asset"),
    finding_code: z
      .string()
      .trim()
      .max(30, "Kode maksimal 30 karakter")
      .refine((v) => v === "" || /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(v), "Hanya huruf, angka, titik, garis bawah, dan strip")
      .optional(),
    catalog_vulna_id: z.string().optional(),
    custom_title: z.string().trim().min(1, "Isi judul finding").max(255),
    severity: z.string().optional(),
    cvss_score: z.string().optional(),
    endpoint: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    const fromCatalog = Boolean(v.catalog_vulna_id);
    if (!fromCatalog && !v.severity) ctx.addIssue({ code: "custom", path: ["severity"], message: "Pilih severity" });
    if (v.cvss_score && !(Number(v.cvss_score) >= 0 && Number(v.cvss_score) <= 10)) ctx.addIssue({ code: "custom", path: ["cvss_score"], message: "CVSS 0 sampai 10" });
  });
type Values = z.infer<typeof schema>;

const selectClass = "h-10 w-full rounded-sm border border-border-control bg-surface px-3 text-input text-ink focus-ring";

export function CreateFindingForm({ project, onSuccess, onCancel }: {
  project: ProjectDetail;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const id = project.project_id;
  const queryClient = useQueryClient();
  const catalog = useQuery({ queryKey: ["catalog", "approved"], queryFn: () => listCatalog({ status: "approved" }) });
  const approvedCatalog = (catalog.data ?? []).filter((c) => !c.status || c.status === "approved");
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });
  const [photos, setPhotos] = useState<File[]>([]);
  const [savedFinding, setSavedFinding] = useState<Finding | null>(null);
  const sessionUser = useSession((s) => s.user);
  // Pentester hanya boleh mencatat temuan di aset yang ditugaskan ke dia (baris mandays).
  const isPentester = sessionUser?.role?.role_name === "pentester";
  const assignedIds = new Set(
    (project.mandays ?? []).filter((m) => m.pentester_id === sessionUser?.sys_user_id).map((m) => m.asset_id),
  );
  const assets = (project.assets ?? []).filter((a) => !isPentester || assignedIds.has(a.assets_id));

  const mutation = useMutation({
    mutationFn: async (v: Values) => {
      let finding = savedFinding;
      if (!finding) {
        finding = await createFinding(id, {
        asset_id: Number(v.asset_id),
        finding_code: v.finding_code || undefined,
        catalog_vulna_id: v.catalog_vulna_id ? Number(v.catalog_vulna_id) : undefined,
        custom_title: v.custom_title || undefined,
        severity: v.severity || undefined,
        cvss_score: v.cvss_score ? Number(v.cvss_score) : undefined,
        endpoint: v.endpoint || undefined,
        });
        setSavedFinding(finding);
        void queryClient.invalidateQueries({ queryKey: ["findings", id] });
      }
      for (const photo of photos) {
        await uploadEvidence(finding.vulna_id, photo);
        void queryClient.invalidateQueries({ queryKey: ["findings", id] });
        setPhotos((remaining) => remaining.filter((file) => file !== photo));
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["findings", id] });
      notify.success("Finding dicatat");
      onSuccess();
    },
  });

  return (
    <form noValidate onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-5">
      {mutation.error ? <Alert tone="error" title="Gagal menyimpan finding">{mutation.error.message}</Alert> : null}
      {savedFinding && mutation.error ? <Alert tone="info" title="Finding sudah tersimpan" compact>Foto yang gagal diunggah masih ada di sini. Klik Coba unggah lagi untuk melanjutkan tanpa membuat finding baru.</Alert> : null}
      <fieldset disabled={mutation.isPending || Boolean(savedFinding)} className="flex min-w-0 flex-col gap-4">
        <FieldGroup>
          <Field label="Asset" error={errors.asset_id?.message} helper={isPentester && assets.length === 0 ? "Belum ada asset yang ditugaskan ke kamu di proyek ini. Minta PM menugaskan lewat Assign Pentester." : undefined}>
            {(f) => (
              <select className={selectClass} defaultValue="" {...f} {...register("asset_id")}>
                <option value="" disabled>Pilih asset</option>
                {assets.map((a) => (<option key={a.assets_id} value={a.assets_id}>{a.asset_name}</option>))}
              </select>
            )}
          </Field>
          <Field label="Category" helper="Pilih kategori dari catalog. Severity dan CVSS terisi otomatis dan bisa kamu ubah. Isi judul finding secara terpisah.">
            {(f) => (
              <select className={selectClass} defaultValue="" {...f} {...register("catalog_vulna_id", { onChange: (event) => {
                const selected = approvedCatalog.find((item) => String(item.vulna_id) === event.target.value);
                if (!selected) return;
                setValue("severity", selected.severity, { shouldValidate: true });
                setValue("cvss_score", selected.cvss_score == null ? "" : String(selected.cvss_score), { shouldValidate: true });
              } })}>
                <option value="">Tanpa category</option>
                {(approvedCatalog).map((c) => (<option key={c.vulna_id} value={c.vulna_id}>{c.title} ({c.severity})</option>))}
              </select>
            )}
          </Field>
          <Field label="Kode finding" error={errors.finding_code?.message} helper="Kode unik findings di proyek ini, terpisah dari judul. Kosongkan untuk kode otomatis (VLN-nomor proyek-urutan), atau isi sendiri, contoh XSS-01.">
            {(f) => <Input placeholder="Otomatis" autoComplete="off" {...f} {...register("finding_code")} />}
          </Field>
          <Field label="Judul finding" error={errors.custom_title?.message}>{(f) => <Input {...f} {...register("custom_title")} />}</Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Severity" error={errors.severity?.message}>
              {(f) => (
                <select className={selectClass} defaultValue="" {...f} {...register("severity")}>
                  <option value="" disabled>Pilih severity</option>
                  {SEVERITIES.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              )}
            </Field>
            <Field label="CVSS score" error={errors.cvss_score?.message}>{(f) => <Input type="number" step="0.1" min={0} max={10} {...f} {...register("cvss_score")} />}</Field>
          </div>
          <Field label="Endpoint" helper="Contoh: POST /api/v1/login">{(f) => <Input {...f} {...register("endpoint")} />}</Field>
        </FieldGroup>
      </fieldset>
      <EvidenceUploader files={photos} onChange={setPhotos} disabled={mutation.isPending} />
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" onClick={onCancel} disabled={mutation.isPending}>Batal</Button>
        <Button type="submit" variant="solid" loading={mutation.isPending}>{savedFinding ? "Coba unggah lagi" : "Simpan finding"}</Button>
      </div>
    </form>
  );
}
