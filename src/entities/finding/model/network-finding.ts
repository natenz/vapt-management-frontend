import { z } from "zod";

export const isNetworkAsset = (type?: string | null) =>
  ["network", "infra", "infrastructure", "network/infra"].includes(type?.trim().toLowerCase() ?? "");

export const NETWORK_TEXT_FIELDS = [
  ["test_scenario", "Skenario Pengujian", 20000],
  ["description", "Description", 20000],
  ["impact", "Impact", 20000],
  ["recommendation", "Recommendation", 20000],
  ["references", "Referensi", 10000],
  ["pentester_note", "Note Pentester", 20000],
] as const;

export const networkFindingSchema = z.object({
  device_name: z.string().trim().max(255).optional(),
  ip_address: z.string().trim().refine((v) => !v || z.ipv4().safeParse(v).success || z.ipv6().safeParse(v).success, "Isi alamat IPv4 atau IPv6 yang valid").optional(),
  test_scenario: z.string().max(20000).optional(),
  description: z.string().max(20000).optional(),
  impact: z.string().max(20000).optional(),
  recommendation: z.string().max(20000).optional(),
  references: z.string().max(10000).optional(),
  cwe: z.string().trim().max(255).optional(),
  pentester_note: z.string().max(20000).optional(),
});
export type NetworkFindingValues = z.infer<typeof networkFindingSchema>;

/** Hanya kolom detail yang diisi form; status tetap mengikuti alur status finding. */
export function networkFindingInput(values: Partial<Record<keyof NetworkFindingValues, string | null>>) {
  return Object.fromEntries(Object.keys(networkFindingSchema.shape).map((key) => [key, values[key as keyof NetworkFindingValues] ?? ""])) as Record<keyof NetworkFindingValues, string>;
}

export const FINDING_STATUS_STAGES = ["Assessment", "Analysis", "Initial Report", "Retesting", "Final Report Drafting"];
export const canEditFindingStatus = (role: string, stage: string) =>
  ["pentester", "technical_writer"].includes(role) && FINDING_STATUS_STAGES.includes(stage);
