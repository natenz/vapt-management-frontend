import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import { createProject, getWorkload } from "@/entities/project";
import { listUsers } from "@/entities/user";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Field, FieldGroup, Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { notify } from "@/shared/ui/toast";
import { TeamPicker } from "@/features/assign-project-team";

const schema = z
  .object({
    project_name: z.string().trim().min(1, "Nama proyek wajib diisi"),
    client_name: z.string().trim().min(1, "Nama unit/klien wajib diisi"),
    start_date: z.string().min(1, "Tanggal mulai wajib diisi"),
    end_date: z.string().min(1, "Tanggal selesai wajib diisi"),
    pm_id: z.string().min(1, "Pilih Project Manager"),
    resource_user_ids: z.array(z.number()).min(1, "Pilih minimal satu anggota tim"),
  })
  .refine((v) => !v.start_date || !v.end_date || v.end_date >= v.start_date, {
    path: ["end_date"],
    message: "Tanggal selesai harus setelah tanggal mulai",
  });
type FormValues = z.input<typeof schema>;

export function ProjectNewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pms = useQuery({ queryKey: ["users", "project_manager"], queryFn: () => listUsers({ role: "project_manager" }) });
  const pentesters = useQuery({ queryKey: ["users", "pentester"], queryFn: () => listUsers({ role: "pentester" }) });
  const workload = useQuery({ queryKey: ["workload"], queryFn: getWorkload });
  const writers = useQuery({ queryKey: ["users", "technical_writer"], queryFn: () => listUsers({ role: "technical_writer" }) });

  const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { resource_user_ids: [] },
  });

  const mutation = useMutation({
    mutationFn: (v: z.output<typeof schema>) =>
      createProject({
        project_name: v.project_name,
        client_name: v.client_name,
        start_date: v.start_date,
        end_date: v.end_date,
        pm_id: Number(v.pm_id),
        assets: [], // aset ditambahkan PM
        resource_user_ids: v.resource_user_ids,
      }),
    onSuccess: (p) => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      notify.success("Project template dibuat", { description: "Status Draft. Serahkan ke PM dari halaman detail." });
      navigate(`/projects/${p.project_id}`);
    },
  });

  return (
    <form noValidate onSubmit={handleSubmit((v) => mutation.mutate(v as z.output<typeof schema>))} className="flex flex-col gap-8">
      <PageHeader
        title="Buat Project Template"
        description="Tentukan proyek, rentang tanggal, PM, dan anggota tim. Aset yang diuji dan penugasan Pentester per aset diisi Project Manager."
        action={<Button type="submit" variant="solid" loading={mutation.isPending}>Simpan sebagai Draft</Button>}
      />

      {mutation.error ? (
        <Alert tone="error" title="Gagal menyimpan template">
          {mutation.error.message}
        </Alert>
      ) : null}

      <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-6" aria-labelledby="info">
        <h2 id="info" className="text-title-md text-ink">Informasi proyek</h2>
        <FieldGroup>
          <Field label="Nama proyek" error={errors.project_name?.message}>{(f) => <Input {...f} {...register("project_name")} />}</Field>
          <Field label="Unit / klien internal" error={errors.client_name?.message}>{(f) => <Input {...f} {...register("client_name")} />}</Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal mulai" error={errors.start_date?.message}>{(f) => <Input type="date" {...f} {...register("start_date")} />}</Field>
            <Field label="Tanggal selesai" error={errors.end_date?.message}>{(f) => <Input type="date" {...f} {...register("end_date")} />}</Field>
          </div>
          <Field label="Project Manager" error={errors.pm_id?.message}>
            {(f) => (
              <Controller
                control={control}
                name="pm_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id={f.id} aria-invalid={f["aria-invalid"]}><SelectValue placeholder="Pilih Project Manager" /></SelectTrigger>
                    <SelectContent>
                      {(pms.data ?? []).map((u) => (
                        <SelectItem key={u.sys_user_id} value={String(u.sys_user_id)}>{u.profile?.full_name ?? u.username}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </Field>
        </FieldGroup>
      </section>

      <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-6" aria-labelledby="team">
        <div>
          <h2 id="team" className="text-title-md text-ink">Anggota tim proyek</h2>
          <p className="text-body-sm text-ink-muted">Orang yang bertugas di proyek ini. PM yang menentukan aset apa saja dan siapa menguji aset yang mana.</p>
        </div>
        {errors.resource_user_ids?.message ? <p className="text-caption text-error">{errors.resource_user_ids.message}</p> : null}
        <Controller
          control={control}
          name="resource_user_ids"
          render={({ field }) => (
            <TeamPicker value={field.value ?? []} onChange={field.onChange} pentesters={pentesters.data ?? []} writers={writers.data ?? []} workload={workload.data ?? {}} />
          )}
        />
      </section>
    </form>
  );
}
