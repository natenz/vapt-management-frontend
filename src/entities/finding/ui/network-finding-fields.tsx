import type { FieldValues, Path, UseFormRegister } from "react-hook-form";
import { Field, Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { NETWORK_TEXT_FIELDS, type NetworkFindingValues } from "../model/network-finding";

export function NetworkFindingFields<T extends FieldValues>({ register, errors }: {
  register: UseFormRegister<T>;
  errors: Partial<Record<keyof NetworkFindingValues, { message?: string }>>;
}) {
  return <>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nama Perangkat" error={errors.device_name?.message}>{(f) => <Input {...f} maxLength={255} {...register("device_name" as Path<T>)} />}</Field>
      <Field label="IP" error={errors.ip_address?.message}>{(f) => <Input {...f} placeholder="192.0.2.10 atau 2001:db8::1" {...register("ip_address" as Path<T>)} />}</Field>
    </div>
    {NETWORK_TEXT_FIELDS.map(([key, label, max]) =>
      <Field key={key} label={label} error={errors[key]?.message}>{(f) => <Textarea {...f} rows={3} maxLength={max} {...register(key as Path<T>)} />}</Field>,
    )}
    <Field label="CWE" error={errors.cwe?.message} helper="Contoh: CWE-200. Bisa diisi lebih dari satu referensi CWE.">{(f) => <Input {...f} maxLength={255} {...register("cwe" as Path<T>)} />}</Field>
  </>;
}
