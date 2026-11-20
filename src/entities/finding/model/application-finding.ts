import { z } from "zod";

export type FindingKind = "network" | "mobile" | "application" | "other";
export function findingKind(type?: string | null): FindingKind {
  const name = type?.trim().toLowerCase() ?? "";
  if (["network", "infra", "infrastructure", "network/infra"].includes(name)) return "network";
  if (["mobile", "mobile app", "mobile application"].includes(name)) return "mobile";
  if (["web", "web application", "website", "api", "rest api"].includes(name)) return "application";
  return "other";
}

// Sumber kategori: https://owasp.github.io/www-project-mobile-top-10/ (edisi 2024).
export const OWASP_MOBILE_2024 = [
  ["M1", "Improper Credential Usage"],
  ["M2", "Inadequate Supply Chain Security"],
  ["M3", "Insecure Authentication/Authorization"],
  ["M4", "Insufficient Input/Output Validation"],
  ["M5", "Insecure Communication"],
  ["M6", "Inadequate Privacy Controls"],
  ["M7", "Insufficient Binary Protections"],
  ["M8", "Security Misconfiguration"],
  ["M9", "Insecure Data Storage"],
  ["M10", "Insufficient Cryptography"],
] as const;

export const APPLICATION_TEXT_FIELDS = [
  ["description", "Description", 20000], ["impact", "Impact", 20000],
  ["recommendation", "Recommendation", 20000], ["references", "References", 10000],
] as const;
export const applicationFindingSchema = z.object({
  app_name: z.string().trim().max(255, "APP Name maksimal 255 karakter").optional(),
  ip_domain: z.string().trim().max(2048, "IP/DOMAIN maksimal 2048 karakter").optional(),
  platform: z.string().trim().max(255, "Platform maksimal 255 karakter").optional(),
  object_source: z.string().max(2000, "Object Source maksimal 2000 karakter").optional(),
  tools: z.string().max(10000, "Tools maksimal 10000 karakter").optional(),
  owasp_mobile_2024: z.string().refine((v) => !v || OWASP_MOBILE_2024.some(([code]) => code === v), "Pilih kategori M1 sampai M10").optional(),
});
export type ApplicationFindingValues = z.infer<typeof applicationFindingSchema>;
type CommonValues = { description?: string | null; impact?: string | null; recommendation?: string | null; references?: string | null; cwe?: string | null };
export function applicationFindingInput(values: Partial<Record<keyof ApplicationFindingValues, string | null>> & CommonValues, kind: FindingKind) {
  const common = { app_name: values.app_name ?? "", platform: values.platform ?? "", description: values.description ?? "", impact: values.impact ?? "", recommendation: values.recommendation ?? "", references: values.references ?? "", cwe: values.cwe ?? "" };
  return kind === "mobile"
    ? { ...common, object_source: values.object_source ?? "", tools: values.tools ?? "", owasp_mobile_2024: values.owasp_mobile_2024 ?? "" }
    : { ...common, ip_domain: values.ip_domain ?? "" };
}
