import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { createHoliday, deleteHoliday, type Holiday } from "@/entities/calendar";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Field, Input } from "@/shared/ui/input";
import { notify } from "@/shared/ui/toast";

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  void qc.invalidateQueries({ queryKey: ["holidays"] });
  void qc.invalidateQueries({ queryKey: ["calendar"] });
};

/** Form tambah hari libur (Tech Lead/Superadmin). Penugasan yang kena hanya diberi peringatan. */
export function AddHolidayForm() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const add = useMutation({
    mutationFn: () => createHoliday({ date, name: name.trim() }),
    onSuccess: (h) => {
      invalidate(queryClient);
      setDate("");
      setName("");
      notify.success(
        "Hari libur ditambahkan",
        h.conflicts.length > 0 ? { description: `Ada ${h.conflicts.length} penugasan di tanggal ini. Kabari PM proyeknya.` } : undefined,
      );
    },
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!date || !name.trim()) {
          setError("Isi tanggal dan nama hari libur");
          return;
        }
        setError(null);
        add.mutate();
      }}
    >
      {add.error ? (
        <Alert tone="error" title="Gagal menambah hari libur" compact>
          {add.error.message}
        </Alert>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-end">
        <Field label="Tanggal libur" error={error ?? undefined}>
          {(f) => <Input type="date" {...f} value={date} onChange={(e) => setDate(e.target.value)} />}
        </Field>
        <Field label="Nama hari libur">
          {(f) => <Input {...f} value={name} maxLength={255} placeholder="Contoh: Libur kantor" onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Button type="submit" variant="solid" leadingIcon={<Plus />} loading={add.isPending}>
          Tambah hari libur
        </Button>
      </div>
    </form>
  );
}

export function DeleteHolidayButton({ holiday }: { holiday: Holiday }) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => deleteHoliday(holiday.holiday_id),
    onSuccess: () => {
      invalidate(queryClient);
      notify.success("Hari libur dihapus");
    },
    onError: (e) => notify.info("Hari libur belum bisa dihapus", { description: e.message }),
  });
  return (
    <Button
      type="button"
      variant="quiet"
      leadingIcon={<Trash2 />}
      loading={remove.isPending}
      aria-label={`Hapus ${holiday.name}`}
      onClick={() => remove.mutate()}
    >
      Hapus
    </Button>
  );
}
