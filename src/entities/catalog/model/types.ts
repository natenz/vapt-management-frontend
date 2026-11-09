import { z } from "zod";

export const catalogSchema = z.object({
  vulna_id: z.number(),
  title: z.string(),
  description: z.string().optional().nullable(),
  severity: z.string(),
  cvss_score: z.number().optional().nullable(),
  remediation_recommendation: z.string().optional().nullable(),
});
export type CatalogVulna = z.infer<typeof catalogSchema>;

export type CatalogInput = {
  title: string;
  description?: string;
  severity: string;
  cvss_score?: number;
  remediation_recommendation?: string;
};
