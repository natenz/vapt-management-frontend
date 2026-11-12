import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, Plus, X, XCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { createCatalog, listCatalog, reviewCatalog, type CatalogVulna } from "@/entities/catalog";
import { useSession } from "@/entities/session";
import { SeverityBadge, SEVERITIES } from "@/entities/finding";
import { toSeverityKey } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/alert";
import { StatusBadge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DataTable } from "@/shared/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Field, FieldGroup, Input, SearchInput } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { TabChip, Tabs, TabsContent, TabsList } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";
import { notify } from "@/shared/ui/toast";

const baseColumns: ColumnDef<CatalogVulna>[] = [
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
  const user = useSession((s) => s.user);
  const role = user?.role?.role_name;
  const canApprove = role === "super_admin" || role === "tech_lead";
  const canPropose = role === "pentester";
  const canSubmit = canApprove || canPropose;

  const approved = useQuery({
    queryKey: ["catalog", "approved"],
    queryFn: () => listCatalog({ status: "approved" }),
  });
  const pending = useQuery({
    queryKey: ["catalog", "pending"],
    queryFn: () => listCatalog({ status: "pending" }),
    enabled: canSubmit,
  });
  const rejected = useQuery({
    queryKey: ["catalog", "rejected"],
    queryFn: () => listCatalog({ status: "rejected" }),
    enabled: canPropose,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });
  const mutation = useMutation({
    mutationFn: (v: Values) => createCatalog({ ...v, cvss_score: v.cvss_score ? Number(v.cvss_score) : undefined }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
      notify.success(canPropose ? "Pengajuan dikirim, menunggu ACC Tech Lead" : "Ditambahkan ke katalog");
      reset();
      setOpen(false);
    },
  });

  const review = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "approved" | "rejected" }) => reviewCatalog(id, status),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
      notify.success(vars.status === "approved" ? "Pengajuan disetujui dan masuk katalog" : "Pengajuan ditolak");
    },
  });

  const approvedRows = (approved.data ?? []).filter((c) => !c.status || c.status === "approved");
  const pendingRows = pending.data ?? [];
  const mySubmissions = [...pendingRows, ...(rejected.data ?? [])].filter(
    (c) => c.created_by == null || user?.sys_user_id == null || c.created_by === user.sys_user_id,
  );

  const reviewColumns: ColumnDef<CatalogVulna>[] = [
    ...baseColumns,
    {
      id: "creator",
      header: "Pengaju",
      cell: ({ row }) => (
        <span className="text-body-sm text-ink-secondary">
          {row.original.creator?.profile?.full_name ?? row.original.creator?.username ?? "-"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="flex items-center gap-2">
          <Button
            type="button"
            variant="solid"
            leadingIcon={<Check />}
            disabled={review.isPending}
            onClick={() => review.mutate({ id: row.original.vulna_id, status: "approved" })}
          >
            ACC
          </Button>
          <Button
            type="button"
            variant="outline"
            leadingIcon={<X />}
            disabled={review.isPending}
            onClick={() => review.mutate({ id: row.original.vulna_id, status: "rejected" })}
          >
            Tolak
          </Button>
        </span>
      ),
    },
  ];

  const submissionColumns: ColumnDef<CatalogVulna>[] = [
    ...baseColumns,
    {
      id: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.status === "rejected" ? (
          <StatusBadge tone="error" icon={<XCircle aria-hidden />}>Ditolak</StatusBadge>
        ) : (
          <StatusBadge tone="warning" icon={<Clock aria-hidden />}>Menunggu ACC</StatusBadge>
        ),
    },
  ];

  const error = approved.error ?? pending.error ?? rejected.error;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Katalog Kerentanan"
        description="Master data kerentanan. Pentester memilih dari katalog yang disetujui saat mencatat temuan."
        action={
          canSubmit ? (
            <Button variant="solid" leadingIcon={<Plus />} onClick={() => setOpen(true)}>
              {canApprove ? "Tambah ke katalog" : "Ajukan ke katalog"}
            </Button>
          ) : undefined
        }
      />
      {error ? <Alert tone="error" title="Gagal memuat katalog">{error.message}</Alert> : null}
      {review.error ? <Alert tone="error" title="Gagal memproses pengajuan" compact>{review.error.message}</Alert> : null}
      <SearchInput aria-label="Cari kerentanan" placeholder="Cari kerentanan" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      {canApprove ? (
        <Tabs defaultValue="approved" className="flex flex-col">
          <TabsList aria-label="Filter katalog kerentanan">
            <TabChip value="approved" count={approvedRows.length}>Disetujui</TabChip>
            <TabChip value="pending" count={pendingRows.length}>Menunggu ACC</TabChip>
          </TabsList>
          <TabsContent value="approved">
            <DataTable columns={baseColumns} data={approvedRows} noun="kerentanan" caption="Katalog kerentanan disetujui" globalFilter={search} isLoading={approved.isLoading} getRowId={(c) => String(c.vulna_id)} />
          </TabsContent>
          <TabsContent value="pending">
            <DataTable columns={reviewColumns} data={pendingRows} noun="pengajuan" caption="Pengajuan katalog menunggu ACC" globalFilter={search} isLoading={pending.isLoading} getRowId={(c) => String(c.vulna_id)} />
          </TabsContent>
        </Tabs>
      ) : canPropose ? (
        <Tabs defaultValue="approved" className="flex flex-col">
          <TabsList aria-label="Filter katalog kerentanan">
            <TabChip value="approved" count={approvedRows.length}>Disetujui</TabChip>
            <TabChip value="submissions" count={mySubmissions.length}>Pengajuan saya</TabChip>
          </TabsList>
          <TabsContent value="approved">
            <DataTable columns={baseColumns} data={approvedRows} noun="kerentanan" caption="Katalog kerentanan disetujui" globalFilter={search} isLoading={approved.isLoading} getRowId={(c) => String(c.vulna_id)} />
          </TabsContent>
          <TabsContent value="submissions">
            <DataTable columns={submissionColumns} data={mySubmissions} noun="pengajuan" caption="Status pengajuan katalog saya" globalFilter={search} isLoading={pending.isLoading || rejected.isLoading} getRowId={(c) => String(c.vulna_id)} />
          </TabsContent>
        </Tabs>
      ) : (
        <DataTable columns={baseColumns} data={approvedRows} noun="kerentanan" caption="Katalog kerentanan" globalFilter={search} isLoading={approved.isLoading} getRowId={(c) => String(c.vulna_id)} />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{canApprove ? "Tambah ke katalog" : "Ajukan ke katalog"}</DialogTitle>
            <DialogDescription>
              {canApprove
                ? "Entri baru langsung muncul sebagai pilihan di form temuan."
                : "Pengajuan baru muncul sebagai pilihan di form temuan setelah disetujui Tech Lead."}
            </DialogDescription>
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
            <Button type="submit" variant="solid" loading={mutation.isPending}>
              {canApprove ? "Simpan" : "Kirim pengajuan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
