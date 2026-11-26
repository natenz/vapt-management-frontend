import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { LEAVE_STATUS_LABEL, LEAVE_STATUSES, LeaveStatusBadge, listLeaves, type Leave, type LeaveStatus } from "@/entities/leave";
import { DeleteLeaveButton, LeaveFormDialog } from "@/features/request-leave";
import { ReviewLeaveButtons } from "@/features/review-leave";
import { fmtRange } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

const select = "h-9 rounded-sm border border-border-control bg-surface px-3 text-body-sm text-ink focus-ring";

export interface LeaveTabProps {
  isAdmin: boolean;
  isPentester: boolean;
  sysUserId: number;
}

export function LeaveTab({ isAdmin, isPentester, sysUserId }: LeaveTabProps) {
  const [sp, setSp] = useSearchParams();
  const raw = sp.get("status");
  // Tech Lead/Superadmin langsung melihat antrean yang perlu ditinjau.
  const status: LeaveStatus | undefined =
    raw && (LEAVE_STATUSES as readonly string[]).includes(raw) ? (raw as LeaveStatus) : raw === null && isAdmin ? "pending" : undefined;
  const [form, setForm] = useState<{ open: boolean; leave: Leave | null }>({ open: false, leave: null });

  const leaves = useQuery({
    queryKey: ["leaves", status ?? "semua"],
    queryFn: () => listLeaves(status ? { status } : {}),
  });
  const showReason = isAdmin || isPentester;
  const canCreate = isAdmin || isPentester;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          aria-label="Filter status cuti"
          className={select}
          value={status ?? "semua"}
          onChange={(e) =>
            setSp(
              (prev) => {
                const p = new URLSearchParams(prev);
                p.set("status", e.target.value);
                return p;
              },
              { replace: true },
            )
          }
        >
          <option value="semua">Semua status</option>
          {LEAVE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAVE_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {canCreate ? (
          <Button variant="solid" leadingIcon={<Plus />} onClick={() => setForm({ open: true, leave: null })}>
            {isAdmin ? "Catat cuti" : "Ajukan cuti"}
          </Button>
        ) : null}
      </div>

      {leaves.error ? (
        <Alert tone="error" title="Daftar cuti belum bisa dimuat">
          {leaves.error.message}
        </Alert>
      ) : leaves.isLoading ? (
        <Skeleton className="h-40" />
      ) : (leaves.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Plus />}
          title="Belum ada cuti"
          description={status === "pending" ? "Tidak ada pengajuan yang menunggu ditinjau." : "Cuti yang diajukan atau dicatat akan muncul di sini."}
        />
      ) : (
        <Table boxed aria-label="Daftar cuti">
          <TableHeader>
            <TableRow>
              <TableHead>Pentester</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead numeric>Hari kerja</TableHead>
              {showReason ? <TableHead>Alasan</TableHead> : null}
              <TableHead>Status</TableHead>
              <TableHead>Bentrok</TableHead>
              {canCreate ? <TableHead>Aksi</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(leaves.data ?? []).map((l) => {
              const mine = l.sys_user_id === sysUserId;
              const editable = isAdmin || (isPentester && mine && l.status === "pending");
              return (
                <TableRow key={l.leave_id}>
                  <TableCell>{l.user_name}</TableCell>
                  <TableCell>{fmtRange(l.start_date, l.end_date)}</TableCell>
                  <TableCell numeric>{l.workdays}</TableCell>
                  {showReason ? <TableCell>{l.reason || "-"}</TableCell> : null}
                  <TableCell>
                    <span className="flex flex-col gap-1">
                      <LeaveStatusBadge status={l.status} />
                      {l.status === "rejected" && l.review_note ? (
                        <span className="text-caption text-ink-muted">Alasan: {l.review_note}</span>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell>
                    {l.conflicts.length > 0 ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-xs bg-error-bg px-1.5 py-0.5 text-caption text-error"
                        title={l.conflicts.map((c) => `${c.project_name} · ${c.asset_name}`).join("\n")}
                      >
                        <AlertTriangle className="size-3" aria-hidden />
                        Bentrok {l.conflicts.length} penugasan
                      </span>
                    ) : (
                      <span className="text-caption text-ink-muted">-</span>
                    )}
                  </TableCell>
                  {canCreate ? (
                    <TableCell>
                      <span className="flex flex-wrap items-center gap-2">
                        {isAdmin && l.status === "pending" ? <ReviewLeaveButtons leave={l} /> : null}
                        {editable ? (
                          <>
                            <Button
                              type="button"
                              variant="quiet"
                              leadingIcon={<Pencil />}
                              aria-label={`Ubah cuti ${l.user_name}`}
                              onClick={() => setForm({ open: true, leave: l })}
                            >
                              Ubah
                            </Button>
                            <DeleteLeaveButton leave={l} label={isAdmin ? "Hapus" : "Batalkan"} />
                          </>
                        ) : null}
                      </span>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <LeaveFormDialog
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        forOthers={isAdmin}
        leave={form.leave}
      />
    </div>
  );
}
