import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createLeave, updateLeave, type Leave } from "@/entities/leave";
import { listUsers } from "@/entities/user";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Field, FieldGroup, Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { notify } from "@/shared/ui/toast";

const select = "h-10 w-full rounded-sm border border-border-control bg-surface px-3 text-input text-ink focus-ring";

const schema = z
  .object({
    sys_user_id: z.string().optional(),
    start_date: z.string().min(1, "Isi tanggal mulai"),
    end_date: z.string().min(1, "Isi tanggal selesai"),
    reason: z.string().trim().max(255, "Alasan maksimal 255 karakter"),
  })
  .refine((v) => !v.start_date || !v.end_date || v.end_date >= v.start_date, {
    path: ["end_date"],
    message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
  });
type Values = z.infer<typeof schema>;

export interface LeaveFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tech Lead/Superadmin mencatat cuti untuk pentester mana pun (langsung disetujui). */
  forOthers: boolean;
  /** Diisi untuk mengubah cuti; kosong untuk cuti baru. */
  leave?: Leave | null;
}

/** Form ajukan, catat, atau ubah cuti. */
export function LeaveFormDialog({ open, onOpenChange, forOthers, leave }: LeaveFormDialogProps) {
  const queryClient = useQueryClient();
  const editing = Boolean(leave);
  const pentesters = useQuery({
    queryKey: ["users", "pentester"],
    queryFn: () => listUsers({ role: "pentester" }),
    enabled: open && forOthers && !editing,
  });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({
        sys_user_id: leave ? String(leave.sys_user_id) : "",
        start_date: leave?.start_date ?? "",
        end_date: leave?.end_date ?? "",
        reason: leave?.reason ?? "",
      });
    }
  }, [open, leave, reset]);

  const save = useMutation({
    mutationFn: (v: Values) => {
      const body = { start_date: v.start_date, end_date: v.end_date, reason: v.reason };
      if (leave) return updateLeave(leave.leave_id, body);
      return createLeave(forOthers ? { sys_user_id: Number(v.sys_user_id), ...body } : body);
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["leaves"] });
      void queryClient.invalidateQueries({ queryKey: ["calendar"] });
      const conflicts = saved.conflicts.length;
      const title = editing ? "Cuti diperbarui" : saved.status === "approved" ? "Cuti dicatat" : "Pengajuan cuti dikirim, menunggu Tech Lead";
      notify.success(title, conflicts > 0 ? { description: `Bentrok dengan ${conflicts} penugasan. Kabari PM proyeknya.` } : undefined);
      onOpenChange(false);
    },
  });

  const submit = handleSubmit((v) => {
    if (forOthers && !editing && !v.sys_user_id) {
      setError("sys_user_id", { message: "Pilih pentester" });
      return;
    }
    save.mutate(v);
  });

  const title = editing ? "Ubah cuti" : forOthers ? "Catat cuti" : "Ajukan cuti";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {forOthers
              ? "Cuti yang dicatat Tech Lead atau Superadmin langsung disetujui."
              : "Pengajuan menunggu persetujuan Tech Lead. Bentrok dengan penugasan hanya jadi peringatan."}
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="mt-4 flex flex-col gap-4">
          {save.error ? (
            <Alert tone="error" title="Gagal menyimpan cuti" compact>
              {save.error.message}
            </Alert>
          ) : null}
          <FieldGroup>
            {forOthers && !editing ? (
              <Field label="Pentester" error={errors.sys_user_id?.message}>
                {(f) => (
                  <select className={select} {...f} {...register("sys_user_id")}>
                    <option value="">Pilih pentester</option>
                    {(pentesters.data ?? []).map((u) => (
                      <option key={u.sys_user_id} value={u.sys_user_id}>
                        {u.profile?.full_name ?? u.username}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tanggal mulai" error={errors.start_date?.message}>
                {(f) => <Input type="date" {...f} {...register("start_date")} />}
              </Field>
              <Field label="Tanggal selesai" error={errors.end_date?.message}>
                {(f) => <Input type="date" {...f} {...register("end_date")} />}
              </Field>
            </div>
            <Field label="Alasan" helper="Hanya terlihat oleh kamu, Tech Lead, dan Superadmin." error={errors.reason?.message}>
              {(f) => <Textarea rows={3} {...f} {...register("reason")} />}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="quiet" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" variant="solid" loading={save.isPending}>
              {editing ? "Simpan perubahan" : forOthers ? "Simpan cuti" : "Kirim pengajuan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
