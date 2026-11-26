import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { reviewLeave, type Leave } from "@/entities/leave";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Field } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { notify } from "@/shared/ui/toast";

/** Tombol Setujui dan Tolak untuk cuti yang masih menunggu (Tech Lead/Superadmin). */
export function ReviewLeaveButtons({ leave }: { leave: Leave }) {
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);

  const review = useMutation({
    mutationFn: (v: { status: "approved" | "rejected"; note?: string }) => reviewLeave(leave.leave_id, v.status, v.note),
    onSuccess: (_, v) => {
      void queryClient.invalidateQueries({ queryKey: ["leaves"] });
      void queryClient.invalidateQueries({ queryKey: ["calendar"] });
      notify.success(v.status === "approved" ? "Cuti disetujui" : "Cuti ditolak");
      setRejecting(false);
    },
  });

  const reject = () => {
    if (!note.trim()) {
      setNoteError("Alasan penolakan wajib diisi");
      return;
    }
    review.mutate({ status: "rejected", note: note.trim() });
  };

  return (
    <>
      <span className="flex items-center gap-2">
        <Button
          type="button"
          variant="solid"
          leadingIcon={<Check />}
          disabled={review.isPending}
          aria-label={`Setujui cuti ${leave.user_name}`}
          onClick={() => review.mutate({ status: "approved" })}
        >
          Setujui
        </Button>
        <Button
          type="button"
          variant="outline"
          leadingIcon={<X />}
          disabled={review.isPending}
          aria-label={`Tolak cuti ${leave.user_name}`}
          onClick={() => {
            setNote("");
            setNoteError(null);
            setRejecting(true);
          }}
        >
          Tolak
        </Button>
      </span>
      {review.error && !rejecting ? (
        <p className="mt-1 text-caption text-error">{review.error.message}</p>
      ) : null}
      <Dialog open={rejecting} onOpenChange={setRejecting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak cuti {leave.user_name}</DialogTitle>
            <DialogDescription>Alasan penolakan dikirim ke pentester bersama statusnya.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-4">
            {review.error ? (
              <Alert tone="error" title="Gagal menolak cuti" compact>
                {review.error.message}
              </Alert>
            ) : null}
            <Field label="Alasan penolakan" error={noteError ?? undefined}>
              {(f) => (
                <Textarea
                  rows={3}
                  {...f}
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setNoteError(null);
                  }}
                />
              )}
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="quiet" onClick={() => setRejecting(false)}>
              Batal
            </Button>
            <Button type="button" variant="solid" loading={review.isPending} onClick={reject}>
              Tolak cuti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
