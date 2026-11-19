import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Activity,
  AlertTriangle,
  BookCheck,
  Check,
  FileText,
  Plus,
  ShieldAlert,
  SlidersHorizontal,
  User as UserIcon,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router";
import { z } from "zod";
import { createCatalog, listCatalog, reviewCatalog, type CatalogVulna } from "@/entities/catalog";
import { SeverityChip, SEVERITIES, severityRank } from "@/entities/finding";
import { useSession } from "@/entities/session";
import { toSeverityKey } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { DataTable } from "@/shared/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { Field, FieldGroup, Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { Textarea } from "@/shared/ui/textarea";
import { notify } from "@/shared/ui/toast";
import {
  EMPTY_CATALOG_FILTERS,
  PAGE_SIZE_OPTIONS,
  applyCatalogFilters,
  getSeverityOptions,
  hasAnyFilter,
  parseCatalogFilters,
  parsePageSize,
  writeCatalogFilters,
  writePageSize,
  type CatalogFilters,
} from "../model/catalog-filters";
import { CatalogFilterBar } from "./catalog-filter-bar";

const baseColumns: ColumnDef<CatalogVulna>[] = [
  {
    accessorKey: "title",
    header: () => (
      <span className="inline-flex items-center gap-1.5 font-normal normal-case">
        <ShieldAlert className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
        <span>Vulnerability</span>
      </span>
    ),
    cell: ({ row }) => <span className="text-title-sm font-normal text-ink">{row.original.title}</span>,
  },
  {
    accessorKey: "severity",
    header: () => (
      <span className="inline-flex items-center gap-1.5 font-normal normal-case">
        <AlertTriangle className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
        <span>Severity</span>
      </span>
    ),
    sortingFn: (rowA, rowB) => {
      const rankA = severityRank(toSeverityKey(rowA.original.severity));
      const rankB = severityRank(toSeverityKey(rowB.original.severity));
      return rankA - rankB;
    },
    cell: ({ row }) => <SeverityChip severity={toSeverityKey(row.original.severity)} />,
  },
  {
    accessorKey: "cvss_score",
    header: () => (
      <span className="inline-flex items-center gap-1.5 font-normal normal-case">
        <Activity className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
        <span>CVSS</span>
      </span>
    ),
    meta: { numeric: true },
    cell: ({ row }) => row.original.cvss_score ?? "-",
  },
  {
    accessorKey: "remediation_recommendation",
    header: () => (
      <span className="inline-flex items-center gap-1.5 font-normal normal-case">
        <FileText className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
        <span>Rekomendasi</span>
      </span>
    ),
    enableSorting: false,
    cell: ({ row }) => (
      <span className="line-clamp-2 text-body-sm text-ink-secondary">
        {row.original.remediation_recommendation}
      </span>
    ),
  },
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
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseCatalogFilters(searchParams), [searchParams]);
  const pageSize = parsePageSize(searchParams);

  const setFilters = (next: CatalogFilters) =>
    setSearchParams((prev) => writeCatalogFilters(next, prev), { replace: true });
  const setPageSize = (next: number) =>
    setSearchParams((prev) => writePageSize(next, prev), { replace: true });

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
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });
  const mutation = useMutation({
    mutationFn: (v: Values) =>
      createCatalog({ ...v, cvss_score: v.cvss_score ? Number(v.cvss_score) : undefined }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
      notify.success(
        canPropose ? "Pengajuan dikirim, menunggu ACC Tech Lead" : "Ditambahkan ke catalog",
      );
      reset();
      setOpen(false);
    },
  });

  const review = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "approved" | "rejected" }) =>
      reviewCatalog(id, status),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
      notify.success(
        vars.status === "approved" ? "Pengajuan disetujui dan masuk catalog" : "Pengajuan ditolak",
      );
    },
  });

  const approvedRows = useMemo(
    () => (approved.data ?? []).filter((c) => !c.status || c.status === "approved"),
    [approved.data],
  );
  const pendingRows = useMemo(() => pending.data ?? [], [pending.data]);

  const filteredApproved = useMemo(
    () => applyCatalogFilters(approvedRows, filters),
    [approvedRows, filters],
  );
  const filteredPending = useMemo(
    () => applyCatalogFilters(pendingRows, filters),
    [pendingRows, filters],
  );

  const isFiltered = hasAnyFilter(filters);

  // Opsi severity dihitung dari keseluruhan data katalog (menunggu ACC & disetujui)
  const allRows = useMemo(
    () => [...pendingRows, ...approvedRows],
    [pendingRows, approvedRows],
  );
  const severityOptions = useMemo(() => getSeverityOptions(allRows), [allRows]);

  const pendingColumns = useMemo<ColumnDef<CatalogVulna>[]>(
    () => [
      ...baseColumns,
      {
        id: "creator",
        header: () => (
          <span className="inline-flex items-center gap-1.5 font-normal normal-case">
            <UserIcon className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
            <span>Pengaju</span>
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-body-sm text-ink-secondary">
            {row.original.creator?.profile?.full_name ?? row.original.creator?.username ?? "-"}
          </span>
        ),
      },
    ],
    [],
  );

  const reviewColumns = useMemo<ColumnDef<CatalogVulna>[]>(
    () => [
      ...pendingColumns,
      {
        id: "actions",
        header: () => (
          <span className="inline-flex items-center gap-1.5 font-normal normal-case">
            <SlidersHorizontal className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
            <span>Aksi</span>
          </span>
        ),
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
    ],
    [pendingColumns, review],
  );

  const error = approved.error ?? pending.error;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Catalog"
        action={
          canSubmit ? (
            <Button variant="solid" leadingIcon={<Plus />} onClick={() => setOpen(true)}>
              {canApprove ? "Tambah ke catalog" : "Ajukan ke catalog"}
            </Button>
          ) : undefined
        }
      />
      {error ? <Alert tone="error" title="Gagal memuat catalog">{error.message}</Alert> : null}
      {review.error ? (
        <Alert tone="error" title="Gagal memproses pengajuan" compact>
          {review.error.message}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-6">
        <CatalogFilterBar
          filters={filters}
          onChange={setFilters}
          severityOptions={severityOptions}
          noun="vulnerabilities"
          resultCount={filteredPending.length + filteredApproved.length}
          totalCount={allRows.length}
        />

        {/* Tabel 1 (Atas): Menunjukkan Menunggu ACC */}
        <section
          id="pending"
          aria-labelledby="catalog-pending-heading"
          className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="catalog-pending-heading" className="text-title-sm font-semibold text-ink">
                    Menunggu ACC
                  </h2>
                  <span className="rounded-full bg-warning-bg px-2 py-0.5 text-caption font-medium text-warning tabular-nums">
                    {filteredPending.length}
                  </span>
                </div>
                <p className="text-caption text-ink-muted">
                  Daftar usulan vulnerability yang diajukan pentester dan menunggu peninjauan Tech Lead.
                </p>
              </div>
            </div>
          </div>

          <DataTable
            key="table-pending"
            columns={canApprove ? reviewColumns : pendingColumns}
            data={filteredPending}
            noun="pengajuan"
            caption="Pengajuan catalog menunggu ACC"
            isLoading={pending.isLoading}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={setPageSize}
            getRowId={(c) => String(c.vulna_id)}
            emptyState={
              isFiltered ? (
                <EmptyState
                  icon={<BookCheck />}
                  title="Tidak ada pengajuan yang cocok"
                  description="Coba ubah kata kunci atau kurangi filter severity."
                  action={
                    <Button variant="quiet" onClick={() => setFilters(EMPTY_CATALOG_FILTERS)}>
                      Reset filter
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={<BookCheck />}
                  title="Tidak ada pengajuan menunggu ACC"
                  description="Pengajuan baru dari pentester akan muncul di sini untuk ditinjau."
                />
              )
            }
          />
        </section>

        {/* Tabel 2 (Bawah): Katalog Kerentanan Disetujui */}
        <section
          id="approved"
          aria-labelledby="catalog-approved-heading"
          className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="catalog-approved-heading" className="text-title-sm font-semibold text-ink">
                    Vulnerability Catalog Disetujui
                  </h2>
                  <span className="rounded-full bg-success-bg px-2 py-0.5 text-caption font-medium text-success tabular-nums">
                    {filteredApproved.length}
                  </span>
                </div>
                <p className="text-caption text-ink-muted">
                  Daftar standar vulnerability yang siap digunakan oleh tim saat mencatat findings pengujian.
                </p>
              </div>
            </div>
          </div>

          <DataTable
            key="table-approved"
            columns={baseColumns}
            data={filteredApproved}
            noun="vulnerabilities"
            caption="Vulnerability Catalog disetujui"
            isLoading={approved.isLoading}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={setPageSize}
            getRowId={(c) => String(c.vulna_id)}
            emptyState={
              isFiltered ? (
                <EmptyState
                  icon={<BookCheck />}
                  title="Tidak ada vulnerability yang cocok"
                  description="Coba ubah kata kunci atau kurangi filter severity."
                  action={
                    <Button variant="quiet" onClick={() => setFilters(EMPTY_CATALOG_FILTERS)}>
                      Reset filter
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={<BookCheck />}
                  title="Belum ada vulnerability disetujui"
                  description="Vulnerability yang telah disetujui akan muncul di sini."
                />
              )
            }
          />
        </section>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{canApprove ? "Tambah ke catalog" : "Ajukan ke catalog"}</DialogTitle>
            <DialogDescription>
              {canApprove
                ? "Entri baru langsung muncul sebagai pilihan di form finding."
                : "Pengajuan baru muncul sebagai pilihan di form finding setelah disetujui Tech Lead."}
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            onSubmit={handleSubmit((v) => mutation.mutate(v))}
            className="mt-4 flex flex-col gap-4"
          >
            {mutation.error ? (
              <Alert tone="error" title="Gagal menyimpan" compact>
                {mutation.error.message}
              </Alert>
            ) : null}
            <FieldGroup>
              <Field label="Judul" error={errors.title?.message}>
                {(f) => <Input {...f} {...register("title")} />}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Severity" error={errors.severity?.message}>
                  {(f) => (
                    <select
                      className="h-10 w-full rounded-sm border border-border-control bg-surface px-3 text-input text-ink focus-ring"
                      defaultValue=""
                      {...f}
                      {...register("severity")}
                    >
                      <option value="" disabled>
                        Pilih severity
                      </option>
                      {SEVERITIES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label="CVSS score">
                  {(f) => (
                    <Input
                      type="number"
                      step="0.1"
                      min={0}
                      max={10}
                      {...f}
                      {...register("cvss_score")}
                    />
                  )}
                </Field>
              </div>
              <Field label="Deskripsi">
                {(f) => <Textarea {...f} {...register("description")} />}
              </Field>
              <Field label="Rekomendasi perbaikan">
                {(f) => <Textarea {...f} {...register("remediation_recommendation")} />}
              </Field>
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
