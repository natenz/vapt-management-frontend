import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Activity,
  AlertTriangle,
  BookCheck,
  Check,
  Clock,
  FileText,
  Plus,
  ShieldAlert,
  SlidersHorizontal,
  User as UserIcon,
  X,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router";
import { z } from "zod";
import { createCatalog, listCatalog, reviewCatalog, type CatalogVulna } from "@/entities/catalog";
import { SeverityChip, SEVERITIES } from "@/entities/finding";
import { useSession } from "@/entities/session";
import { toSeverityKey } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/alert";
import { StatusChip } from "@/shared/ui/badge";
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
  parseCatalogView,
  parsePageSize,
  writeCatalogFilters,
  writeCatalogView,
  writePageSize,
  type CatalogFilters,
  type CatalogView,
} from "../model/catalog-filters";
import { CatalogFilterBar, type CatalogViewOption } from "./catalog-filter-bar";

const baseColumns: ColumnDef<CatalogVulna>[] = [
  {
    accessorKey: "title",
    header: () => (
      <span className="inline-flex items-center gap-1.5 font-normal normal-case">
        <ShieldAlert className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
        <span>Kerentanan</span>
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
    enabled: canSubmit,
  });
  const rejected = useQuery({
    queryKey: ["catalog", "rejected"],
    queryFn: () => listCatalog({ status: "rejected" }),
    enabled: canPropose,
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
        canPropose ? "Pengajuan dikirim, menunggu ACC Tech Lead" : "Ditambahkan ke katalog",
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
        vars.status === "approved" ? "Pengajuan disetujui dan masuk katalog" : "Pengajuan ditolak",
      );
    },
  });

  const approvedRows = useMemo(
    () => (approved.data ?? []).filter((c) => !c.status || c.status === "approved"),
    [approved.data],
  );
  const pendingRows = useMemo(() => pending.data ?? [], [pending.data]);
  const mySubmissions = useMemo(
    () =>
      [...pendingRows, ...(rejected.data ?? [])].filter(
        (c) => c.created_by == null || user?.sys_user_id == null || c.created_by === user.sys_user_id,
      ),
    [pendingRows, rejected.data, user?.sys_user_id],
  );

  const filteredApproved = useMemo(
    () => applyCatalogFilters(approvedRows, filters),
    [approvedRows, filters],
  );
  const filteredPending = useMemo(
    () => applyCatalogFilters(pendingRows, filters),
    [pendingRows, filters],
  );
  const filteredSubmissions = useMemo(
    () => applyCatalogFilters(mySubmissions, filters),
    [mySubmissions, filters],
  );

  const isFiltered = hasAnyFilter(filters);

  // Pilihan status mengikuti peran: approver meninjau antrean, pentester memantau pengajuannya
  const viewOptions = useMemo<CatalogViewOption[]>(() => {
    const approvedOpt: CatalogViewOption = {
      value: "approved",
      label: "Disetujui",
      count: filteredApproved.length,
    };
    if (canApprove)
      return [approvedOpt, { value: "pending", label: "Menunggu ACC", count: filteredPending.length }];
    if (canPropose)
      return [
        approvedOpt,
        { value: "submissions", label: "Pengajuan saya", count: filteredSubmissions.length },
      ];
    return [approvedOpt];
  }, [canApprove, canPropose, filteredApproved.length, filteredPending.length, filteredSubmissions.length]);

  const view = parseCatalogView(
    searchParams,
    viewOptions.map((o) => o.value),
  );
  const setView = (next: CatalogView) =>
    setSearchParams((prev) => writeCatalogView(next, prev), { replace: true });

  // Opsi severity dihitung dari data pada status aktif agar jumlahnya sesuai tabel
  const viewSource =
    view === "pending" ? pendingRows : view === "submissions" ? mySubmissions : approvedRows;
  const severityOptions = useMemo(() => getSeverityOptions(viewSource), [viewSource]);

  const reviewColumns = useMemo<ColumnDef<CatalogVulna>[]>(
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
    [review],
  );

  const submissionColumns = useMemo<ColumnDef<CatalogVulna>[]>(
    () => [
      ...baseColumns,
      {
        id: "status",
        header: () => (
          <span className="inline-flex items-center gap-1.5 font-normal normal-case">
            <Clock className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
            <span>Status</span>
          </span>
        ),
        cell: ({ row }) =>
          row.original.status === "rejected" ? (
            <StatusChip tone="error" icon={<XCircle />}>
              Ditolak
            </StatusChip>
          ) : (
            <StatusChip tone="warning" icon={<Clock />}>
              Menunggu ACC
            </StatusChip>
          ),
      },
    ],
    [],
  );

  const error = approved.error ?? pending.error ?? rejected.error;

  // Konfigurasi tabel per status yang dipilih di dropdown "Status"
  const table =
    view === "pending"
      ? {
          columns: reviewColumns,
          data: filteredPending,
          total: pendingRows.length,
          noun: "pengajuan",
          caption: "Pengajuan katalog menunggu ACC",
          isLoading: pending.isLoading,
          filteredEmptyTitle: "Tidak ada pengajuan yang cocok",
          emptyTitle: "Tidak ada pengajuan menunggu ACC",
          emptyDescription: "Pengajuan baru dari pentester akan muncul di sini untuk ditinjau.",
        }
      : view === "submissions"
        ? {
            columns: submissionColumns,
            data: filteredSubmissions,
            total: mySubmissions.length,
            noun: "pengajuan",
            caption: "Status pengajuan katalog saya",
            isLoading: pending.isLoading || rejected.isLoading,
            filteredEmptyTitle: "Tidak ada pengajuan yang cocok",
            emptyTitle: "Belum ada riwayat pengajuan",
            emptyDescription: "Kerentanan yang Anda ajukan akan muncul di sini.",
          }
        : {
            columns: baseColumns,
            data: filteredApproved,
            total: approvedRows.length,
            noun: "kerentanan",
            caption: "Katalog kerentanan disetujui",
            isLoading: approved.isLoading,
            filteredEmptyTitle: "Tidak ada kerentanan yang cocok",
            emptyTitle: "Belum ada kerentanan disetujui",
            emptyDescription: "Kerentanan yang telah disetujui akan muncul di sini.",
          };

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
      {review.error ? (
        <Alert tone="error" title="Gagal memproses pengajuan" compact>
          {review.error.message}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-4">
        <CatalogFilterBar
          filters={filters}
          onChange={setFilters}
          severityOptions={severityOptions}
          viewOptions={viewOptions}
          view={view}
          onViewChange={setView}
          noun={table.noun}
          resultCount={table.data.length}
          totalCount={table.total}
        />

        <DataTable
          // Remount saat status berganti agar urutan & halaman tidak terbawa
          key={view}
          columns={table.columns}
          data={table.data}
          noun={table.noun}
          caption={table.caption}
          isLoading={table.isLoading}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={setPageSize}
          getRowId={(c) => String(c.vulna_id)}
          emptyState={
            isFiltered ? (
              <EmptyState
                icon={<BookCheck />}
                title={table.filteredEmptyTitle}
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
                title={table.emptyTitle}
                description={table.emptyDescription}
              />
            )
          }
        />
      </div>

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
