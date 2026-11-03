import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createAsset, deleteAsset } from "@/entities/project/api";
import type { Asset } from "@/shared/api/schemas";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Field, Input } from "@/shared/ui/input";
import { notify } from "@/shared/ui/toast";

const ASSET_TYPES = ["web", "api", "mobile", "network"];
const schema = z.object({
  asset_name: z.string().trim().min(1, "Nama aset wajib diisi"),
  asset_type: z.string().min(1),
  domain: z.string().optional(),
  ip_address: z.string().optional(),
  mandays: z.coerce.number().min(0, "Tidak boleh negatif"),
});
type Values = z.input<typeof schema>;

const refresh = (qc: ReturnType<typeof useQueryClient>, id: number) => {
  void qc.invalidateQueries({ queryKey: ["project", id] });
  void qc.invalidateQueries({ queryKey: ["projects"] });
};

/** PM menentukan aset yang diuji (POST /projects/:id/assets). Total mandays dihitung ulang oleh BE. */
export function ManageAssets({ projectId }: { projectId: number }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { asset_type: "web", mandays: 0 },
  });
  const mutation = useMutation({
    mutationFn: (v: z.output<typeof schema>) =>
      createAsset(projectId, {
        asset_name: v.asset_name,
        asset_type: v.asset_type,
        mandays: v.mandays,
        domain: v.domain || undefined,
        ip_address: v.ip_address || undefined,
      }),
    onSuccess: () => {
      refresh(qc, projectId);
      notify.success("Aset ditambahkan");
      reset({ asset_type: "web", mandays: 0 });
    },
  });

  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-6" aria-labelledby="add-asset">
      <div>
        <h2 id="add-asset" className="text-title-md text-ink">Tambah aset yang diuji</h2>
        <p className="text-body-sm text-ink-muted">PM menentukan aset apa saja yang masuk proyek ini. Total mandays dihitung otomatis.</p>
      </div>
      {mutation.error ? <Alert tone="error" title="Gagal menambah aset" compact>{mutation.error.message}</Alert> : null}
      <form noValidate onSubmit={handleSubmit((v) => mutation.mutate(v as z.output<typeof schema>))} className="grid gap-4 md:grid-cols-[2fr_1fr_2fr_1.5fr_1fr] md:items-start">
        <Field label="Nama aset" error={errors.asset_name?.message}>{(f) => <Input {...f} {...register("asset_name")} />}</Field>
        <Field label="Tipe">
          {(f) => (
            <select id={f.id} className="h-10 w-full rounded-sm border border-border-control bg-surface px-3 text-input text-ink focus-ring" {...register("asset_type")}>
              {ASSET_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          )}
        </Field>
        <Field label="Domain">{(f) => <Input {...f} {...register("domain")} placeholder="portal.contoh.co.id" />}</Field>
        <Field label="IP address" error={errors.ip_address?.message}>{(f) => <Input {...f} {...register("ip_address")} placeholder="10.0.0.1" />}</Field>
        <Field label="Mandays" error={errors.mandays?.message}>{(f) => <Input type="number" min={0} step="0.5" {...f} {...register("mandays")} />}</Field>
        <div className="md:col-span-5"><Button type="submit" variant="solid" loading={mutation.isPending}>Tambah aset</Button></div>
      </form>
    </section>
  );
}

export function DeleteAssetButton({ projectId, asset }: { projectId: number; asset: Asset }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => deleteAsset(asset.assets_id),
    onSuccess: () => { refresh(qc, projectId); notify.success("Aset dihapus"); },
    onError: (e) => notify.info("Gagal menghapus aset", { description: e.message }),
  });
  return (
    <Button type="button" variant="quiet" aria-label={`Hapus aset ${asset.asset_name}`} loading={mutation.isPending} onClick={() => mutation.mutate()}>
      <Trash2 />
    </Button>
  );
}
