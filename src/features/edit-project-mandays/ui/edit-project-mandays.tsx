import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { updateProjectMandays, type ProjectDetail } from "@/entities/project";
import { useSession } from "@/entities/session";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui/dialog";
import { Field, Input } from "@/shared/ui/input";
import { notify } from "@/shared/ui/toast";

export function EditProjectMandays({ project }: { project: ProjectDetail }) {
  const user = useSession((s) => s.user);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (mandays: number) => updateProjectMandays(project.project_id, mandays),
    onSuccess: (updated) => {
      qc.setQueryData(["project", project.project_id], updated);
      void qc.invalidateQueries({ queryKey: ["project", project.project_id] });
      void qc.invalidateQueries({ queryKey: ["projects"] });
      notify.success("Mandays proyek diperbarui");
      setOpen(false);
    },
  });
  if (user?.role?.role_name !== "project_manager" || user.sys_user_id !== project.pm_id) return null;

  const onOpenChange = (next: boolean) => {
    if (save.isPending) return;
    if (next) {
      setValue(String(project.projected_mandays ?? 0));
      setError(null);
      save.reset();
    }
    setOpen(next);
  };
  const submit = () => {
    const amount = Number(value);
    if (!value.trim() || !Number.isFinite(amount) || amount < 0 || amount > 999999.99 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) {
      setError("Isi mandays dari 0 sampai 999999,99 dengan maksimal 2 angka desimal."); return;
    }
    if (amount > 0 && amount < project.total_mandays) {
      setError(`Mandays proyek minimal ${project.total_mandays} md, sesuai total asset yang sudah tersimpan.`); return;
    }
    setError(null);
    save.mutate(amount);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button type="button" variant="quiet" className="h-8 justify-start px-0 text-xs" leadingIcon={<Pencil />}>Edit mandays proyek</Button></DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Edit mandays proyek</DialogTitle>
          <DialogDescription>{project.project_name}</DialogDescription>
        </DialogHeader>
        <form className="mt-5 flex flex-col gap-4" noValidate onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <p className="text-body-sm text-ink-secondary">Terpakai oleh asset: {project.total_mandays} md.</p>
          <Field label="Mandays proyek" error={error ?? undefined} helper="Jatah mandays untuk seluruh asset. Nilai 0 berarti jatah belum ditetapkan.">
            {(field) => <Input {...field} type="number" min={0} max={999999.99} step="0.01" value={value} disabled={save.isPending} onChange={(e) => setValue(e.target.value)} />}
          </Field>
          {save.error ? <Alert tone="error" title="Mandays belum tersimpan" compact>{save.error.message}</Alert> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" disabled={save.isPending} onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" variant="solid" loading={save.isPending}>Simpan mandays</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
