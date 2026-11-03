import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { z } from "zod";
import { listCatalog } from "@/entities/catalog/api";
import { createFinding } from "@/entities/finding/api";
import { getProject } from "@/entities/project/api";
import { SEVERITIES } from "@/shared/api/schemas";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Field, FieldGroup, Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { notify } from "@/shared/ui/toast";

// BE (trx_vulna) baru menyimpan: judul, severity, CVSS, endpoint, aset. Kolom Impact/CWE/
// Recommendation/References dari template "Tracking Finding" BELUM ada di API; lihat README.
const schema = z
  .object({
    asset_id: z.string().min(1, "Pilih aset"),
    catalog_vulna_id: z.string().optional(),
    custom_title: z.string().trim().max(255).optional(),
    severity: z.string().optional(),
    cvss_score: z.string().optional(),
    endpoint: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    const fromCatalog = Boolean(v.catalog_vulna_id);
    if (!fromCatalog && !v.custom_title) ctx.addIssue({ code: "custom", path: ["custom_title"], message: "Isi judul atau pilih dari katalog" });
    if (!fromCatalog && !v.severity) ctx.addIssue({ code: "custom", path: ["severity"], message: "Pilih severity" });
    if (v.cvss_score && !(Number(v.cvss_score) >= 0 && Number(v.cvss_score) <= 10)) ctx.addIssue({ code: "custom", path: ["cvss_score"], message: "CVSS 0 sampai 10" });
  });
type Values = z.infer<typeof schema>;

const selectClass = "h-10 w-full rounded-sm border border-border-control bg-surface px-3 text-input text-ink focus-ring";

export function FindingFormPage() {
  const { projectId } = useParams();
  const id = Number(projectId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const project = useQuery({ queryKey: ["project", id], queryFn: () => getProject(id) });
  const catalog = useQuery({ queryKey: ["catalog"], queryFn: () => listCatalog() });
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });
  const fromCatalog = Boolean(watch("catalog_vulna_id"));

  const mutation = useMutation({
    mutationFn: (v: Values) =>
      createFinding(id, {
        asset_id: Number(v.asset_id),
        catalog_vulna_id: v.catalog_vulna_id ? Number(v.catalog_vulna_id) : undefined,
        custom_title: v.custom_title || undefined,
        severity: v.severity || undefined,
        cvss_score: v.cvss_score ? Number(v.cvss_score) : undefined,
        endpoint: v.endpoint || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["findings", id] });
      notify.success("Temuan dicatat");
      navigate(`/projects/${id}`);
    },
  });

  return (
    <form noValidate onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Tambah Temuan"
        description={project.data?.project_name ?? "Catat kerentanan yang ditemukan pada aset."}
        action={<Button type="submit" variant="solid" loading={mutation.isPending}>Simpan temuan</Button>}
      />
      {mutation.error ? <Alert tone="error" title="Gagal menyimpan temuan">{mutation.error.message}</Alert> : null}
      <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-6">
        <FieldGroup>
          <Field label="Aset" error={errors.asset_id?.message}>
            {(f) => (
              <select className={selectClass} defaultValue="" {...f} {...register("asset_id")}>
                <option value="" disabled>Pilih aset</option>
                {(project.data?.assets ?? []).map((a) => (<option key={a.assets_id} value={a.assets_id}>{a.asset_name}</option>))}
              </select>
            )}
          </Field>
          <Field label="Dari katalog kerentanan" helper="Judul, severity, dan CVSS terisi otomatis dari katalog.">
            {(f) => (
              <select className={selectClass} defaultValue="" {...f} {...register("catalog_vulna_id")}>
                <option value="">Tidak, isi sendiri</option>
                {(catalog.data ?? []).map((c) => (<option key={c.vulna_id} value={c.vulna_id}>{c.title} ({c.severity})</option>))}
              </select>
            )}
          </Field>
          <Field label="Judul temuan" error={errors.custom_title?.message}>{(f) => <Input {...f} {...register("custom_title")} />}</Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Severity" error={errors.severity?.message}>
              {(f) => (
                <select className={selectClass} disabled={fromCatalog} defaultValue="" {...f} {...register("severity")}>
                  <option value="" disabled>{fromCatalog ? "Dari katalog" : "Pilih severity"}</option>
                  {SEVERITIES.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              )}
            </Field>
            <Field label="CVSS score" error={errors.cvss_score?.message}>{(f) => <Input type="number" step="0.1" min={0} max={10} disabled={fromCatalog} {...f} {...register("cvss_score")} />}</Field>
          </div>
          <Field label="Endpoint" helper="Contoh: POST /api/v1/login">{(f) => <Input {...f} {...register("endpoint")} />}</Field>
        </FieldGroup>
      </div>
      <Alert tone="info" title="Evidence" compact>
        Lampiran bukti (S3) dikirim sebagai metadata ke <code>POST /vulnas/:id/evidences</code>. Pengunggahan file ke S3 belum
        ada di BE, jadi form unggah belum dipasang.
      </Alert>
    </form>
  );
}
