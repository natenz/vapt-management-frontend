import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { deleteLeave, type Leave } from "@/entities/leave";
import { Button } from "@/shared/ui/button";
import { notify } from "@/shared/ui/toast";

/** Pentester membatalkan cuti yang masih menunggu; Tech Lead/Superadmin menghapus cuti. */
export function DeleteLeaveButton({ leave, label }: { leave: Leave; label: "Batalkan" | "Hapus" }) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => deleteLeave(leave.leave_id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["leaves"] });
      void queryClient.invalidateQueries({ queryKey: ["calendar"] });
      notify.success(label === "Batalkan" ? "Pengajuan cuti dibatalkan" : "Cuti dihapus");
    },
    onError: (e) => notify.info("Cuti belum bisa dihapus", { description: e.message }),
  });
  return (
    <Button
      type="button"
      variant="quiet"
      leadingIcon={<Trash2 />}
      loading={remove.isPending}
      aria-label={`${label} cuti ${leave.user_name}`}
      onClick={() => remove.mutate()}
    >
      {label}
    </Button>
  );
}
