import type { FieldValues, Path, UseFormRegister } from "react-hook-form";
import { Field, Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { APPLICATION_TEXT_FIELDS, OWASP_MOBILE_2024, type ApplicationFindingValues } from "../model/application-finding";

type FieldKey = keyof ApplicationFindingValues | "description" | "impact" | "recommendation" | "references" | "cwe" | "endpoint";
export function ApplicationFindingFields<T extends FieldValues>({ register, errors, mobile, section }: {
  register: UseFormRegister<T>; errors: Partial<Record<FieldKey, { message?: string }>>;
  mobile: boolean; section: "identity" | "details";
}) {
  if (section === "identity") return <>
    <Field label="APP Name" error={errors.app_name?.message}>{(f) => <Input {...f} maxLength={255} {...register("app_name" as Path<T>)} />}</Field>
    {mobile ? <>
      <Field label="Object Source" error={errors.object_source?.message} helper="Sumber aplikasi yang diuji, misalnya file APK/IPA, store, atau repositori.">{(f) => <Textarea {...f} rows={2} maxLength={2000} {...register("object_source" as Path<T>)} />}</Field>
      <Field label="Tools" error={errors.tools?.message}>{(f) => <Textarea {...f} rows={2} maxLength={10000} {...register("tools" as Path<T>)} />}</Field>
    </> : <Field label="IP/DOMAIN" error={errors.ip_domain?.message}>{(f) => <Input {...f} maxLength={2048} {...register("ip_domain" as Path<T>)} />}</Field>}
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Endpoint" error={errors.endpoint?.message}>{(f) => <Input {...f} {...register("endpoint" as Path<T>)} />}</Field>
      <Field label="Platform" error={errors.platform?.message}>{(f) => <Input {...f} placeholder={mobile ? "Android atau iOS" : "Platform aplikasi yang diuji"} maxLength={255} {...register("platform" as Path<T>)} />}</Field>
    </div>
  </>;
  return <>
    {APPLICATION_TEXT_FIELDS.map(([key, label, max]) => <Field key={key} label={label} error={errors[key]?.message}>{(f) => <Textarea {...f} rows={3} maxLength={max} {...register(key as Path<T>)} />}</Field>)}
    <Field label="CWE" error={errors.cwe?.message} helper="Contoh: CWE-79 atau CWE-89.">{(f) => <Input {...f} maxLength={255} {...register("cwe" as Path<T>)} />}</Field>
    {mobile ? <Field label="OWASP Mobile Top 10 2024" error={errors.owasp_mobile_2024?.message}>{(f) => <select {...f} className="h-10 w-full rounded-sm border border-border-control bg-surface px-3 text-input text-ink focus-ring" {...register("owasp_mobile_2024" as Path<T>)}>
      <option value="">Belum diklasifikasikan</option>
      {OWASP_MOBILE_2024.map(([code, label]) => <option key={code} value={code}>{code}: {label}</option>)}
    </select>}</Field> : null}
  </>;
}
