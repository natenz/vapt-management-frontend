import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { createCatalog, listCatalog, type CatalogVulna } from "@/entities/catalog";
import { useSession } from "@/entities/session";
import { SEVERITIES } from "@/shared/api/schemas";
import { toSeverityKey } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { DataTable } from "@/shared/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Field, FieldGroup, Input, SearchInput } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { SeverityBadge } from "@/shared/ui/severity-badge";
import { Textarea } from "@/shared/ui/textarea";
import { notify } from "@/shared/ui/toast";

const columns: ColumnDef<CatalogVulna>[] = [
  { accessorKey: "title", header: "Kerentanan", cell: ({ row }) => <span className="text-title-sm text-ink">{row.original.title}</span> },
  { accessorKey: "severity", header: "Severity", cell: ({ row }) => <SeverityBadge severity={toSeverityKey(row.original.severity)} /> },
  { accessorKey: "cvss_score", header: "CVSS", meta: { numeric: true }, cell: ({ row }) => row.original.cvss_score ?? "-" },
  { accessorKey: "remediation_recommendation", header: "Rekomendasi", enableSorting: false, cell: ({ row }) => <span className="line-clamp-2 text-body-sm text-ink-secondary">{row.original.remediation_recommendation}</span> },
];

const schema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(255),
  severity: z.enum(SEVERITIES, { message: "Pilih severity" }),
  cvss_score: z.string().optional(),
  description: z.string().optional(),
  remediation_recommendation: z.string().optional(),
});
type Values = z.infer<typeof schema>;

export function CatalogPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const role = useSession((s) => s.user?.role?.role_name);
  // BE: POST/PUT/DELETE katalog hanya super_admin dan tech_lead.
  const canEdit = role === "super_admin" || role === "tech_lead";
  const { data, isLoading, error } = useQuery({ queryKey: ["catalog"], queryFn: () => listCatalog() });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });
  const mutation = useMutation({
    mutationFn: (v: Values) => createCatalog({ ...v, cvss_score: v.cvss_score ? Number(v.cvss_score) : undefined }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
      notify.success("Ditambahkan ke katalog");
      reset();
      setOpen(false);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Katalog Kerentanan"
        description="Master data kerentanan. Pentester memilih dari sini saat mencatat temuan."
        action={canEdit ? <Button variant="solid" leadingIcon={<Plus />} onClick={() => setOpen(true)}>Tambah ke katalog</Button> : undefined}
      />
      {error ? <Alert tone="error" title="Gagal memuat katalog">{error.message}</Alert> : null}
      <SearchInput aria-label="Cari kerentanan" placeholder="Cari kerentanan" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      <DataTable columns={columns} data={data ?? []} noun="kerentanan" caption="Katalog kerentanan" globalFilter={search} isLoading={isLoading} getRowId={(c) => String(c.vulna_id)} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Tambah ke katalog</DialogTitle>
            <DialogDescription>Entri baru muncul sebagai pilihan di form temuan.</DialogDescription>
          </DialogHeader>
          <form noValidate onSubmit={handleSubmit((v) => mutation.mutate(v))} className="mt-4 flex flex-col gap-4">
            {mutation.error ? <Alert tone="error" title="Gagal menyimpan" compact>{mutation.error.message}</Alert> : null}
            <FieldGroup>
              <Field label="Judul" error={errors.title?.message}>{(f) => <Input {...f} {...register("title")} />}</Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Severity" error={errors.severity?.message}>
                  {(f) => (
                    <select className="h-10 w-full rounded-sm border border-border-control bg-surface px-3 text-input text-ink focus-ring" defaultValue="" {...f} {...register("severity")}>
                      <option value="" disabled>Pilih severity</option>
                      {SEVERITIES.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  )}
                </Field>
                <Field label="CVSS score">{(f) => <Input type="number" step="0.1" min={0} max={10} {...f} {...register("cvss_score")} />}</Field>
              </div>
              <Field label="Deskripsi">{(f) => <Textarea {...f} {...register("description")} />}</Field>
              <Field label="Rekomendasi perbaikan">{(f) => <Textarea {...f} {...register("remediation_recommendation")} />}</Field>
            </FieldGroup>
            <Button type="submit" variant="solid" loading={mutation.isPending}>Simpan</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
