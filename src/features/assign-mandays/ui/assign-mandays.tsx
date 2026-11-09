import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createMandays, deleteMandays, type Mandays, type ProjectDetail } from "@/entities/project";
import { getErrorDetails } from "@/shared/api/api-error";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Field, Input } from "@/shared/ui/input";
import { notify } from "@/shared/ui/toast";
import { fmtRange } from "@/shared/lib/format";

const schema = z.object({
  asset_id: z.string().min(1, "Pilih aset"),
  pentester_id: z.string().min(1, "Pilih pentester"),
  start_date: z.string().min(1, "Wajib diisi"),
  end_date: z.string().min(1, "Wajib diisi"),
  allocated_mandays: z.coerce.number().gt(0, "Harus lebih dari 0"),
});
type Values = z.input<typeof schema>;

function DeleteAssignmentButton({ projectId, m }: { projectId: number; m: Mandays }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: () => deleteMandays(m.mandays_id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["project", projectId] }); void qc.invalidateQueries({ queryKey: ["workload"] }); notify.success("Penugasan dihapus"); },
    onError: (e) => notify.info("Penugasan belum bisa dihapus", { description: e.message }),
  });
  const who = m.pentester?.profile?.full_name ?? m.pentester?.username ?? "pentester";
  return (
    <Button type="button" variant="quiet" aria-label={`Hapus penugasan ${who} di ${m.asset?.asset_name ?? "aset"}`} loading={del.isPending} onClick={() => del.mutate()}>
      <Trash2 />
    </Button>
  );
}

/** PM menugaskan pentester ke aset + jadwalnya (POST /projects/:id/mandays). */
export function AssignMandays({ project }: { project: ProjectDetail }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });
  const pentesters = project.resources
    .map((r) => r.user?.sys_user)
    .filter((u): u is NonNullable<typeof u> => Boolean(u) && u?.role?.role_name === "pentester");

  const mutation = useMutation({
    mutationFn: (v: z.output<typeof schema>) =>
      createMandays(project.project_id, {
        asset_id: Number(v.asset_id),
        pentester_id: Number(v.pentester_id),
        start_date: v.start_date,
        end_date: v.end_date,
        allocated_mandays: v.allocated_mandays,
        status: "planned",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project", project.project_id] });
      void queryClient.invalidateQueries({ queryKey: ["workload"] });
      notify.success("Pentester ditugaskan");
      reset();
    },
  });

  const selectClass = "h-10 w-full rounded-sm border border-border-control bg-surface px-3 text-input text-ink focus-ring";

  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-6" aria-labelledby="assign">
      <div>
        <h2 id="assign" className="text-title-md text-ink">Assign Pentester per aset</h2>
        <p className="text-body-sm text-ink-muted">Setiap aset harus punya pentester sebelum proyek bisa masuk tahap Pentest.</p>
      </div>
      {project.mandays.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border rounded-sm border border-border">
          {project.mandays.map((m) => (
            <li key={m.mandays_id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-body-sm">
              <span className="text-ink">{m.asset?.asset_name ?? `Aset ${m.asset_id}`}</span>
              <span className="flex items-center gap-2 text-ink-secondary">
                {m.pentester?.profile?.full_name ?? m.pentester?.username} · {fmtRange(m.start_date, m.end_date)} · {m.allocated_mandays} md
                <DeleteAssignmentButton projectId={project.project_id} m={m} />
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {mutation.error ? (
        <Alert tone="error" title="Gagal menugaskan" compact>
          {getErrorDetails(mutation.error).length > 0
            ? getErrorDetails(mutation.error).join(", ")
            : mutation.error.message}
        </Alert>
      ) : null}
      <form noValidate onSubmit={handleSubmit((v) => mutation.mutate(v as z.output<typeof schema>))} className="grid gap-4 md:grid-cols-5 md:items-start">
        <Field label="Aset" error={errors.asset_id?.message}>
          {(f) => (
            <select className={selectClass} defaultValue="" {...f} {...register("asset_id")}>
              <option value="" disabled>Pilih aset</option>
              {project.assets.map((a) => (<option key={a.assets_id} value={a.assets_id}>{a.asset_name}</option>))}
            </select>
          )}
        </Field>
        <Field label="Pentester" error={errors.pentester_id?.message}>
          {(f) => (
            <select className={selectClass} defaultValue="" {...f} {...register("pentester_id")}>
              <option value="" disabled>Pilih pentester</option>
              {pentesters.map((u) => (<option key={u.sys_user_id} value={u.sys_user_id}>{u.profile?.full_name ?? u.username}</option>))}
            </select>
          )}
        </Field>
        <Field label="Mulai" error={errors.start_date?.message}>{(f) => <Input type="date" {...f} {...register("start_date")} />}</Field>
        <Field label="Selesai" error={errors.end_date?.message}>{(f) => <Input type="date" {...f} {...register("end_date")} />}</Field>
        <Field label="Mandays" error={errors.allocated_mandays?.message}>{(f) => <Input type="number" step="0.5" min={0.5} {...f} {...register("allocated_mandays")} />}</Field>
        <div className="md:col-span-5">
          <Button type="submit" variant="solid" loading={mutation.isPending}>Simpan penugasan</Button>
        </div>
      </form>
    </section>
  );
}
