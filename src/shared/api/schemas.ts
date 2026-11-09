// Kontrak API backend (vapt-management-backend, branch development).
// Sumber kebenaran: internal/model + internal/dto. Ubah di sini bila BE berubah.
import { z } from "zod";

export const ROLES = [
  "super_admin",
  "tech_lead",
  "project_manager",
  "pentester",
  "technical_writer",
] as const;
export type RoleName = (typeof ROLES)[number];

export const SEVERITIES = ["Critical", "High", "Medium", "Low", "Informational"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const PROJECT_STATUSES = [
  "Draft",
  "Planning",
  "Pentest",
  "Reporting",
  "Remediation",
  "Retest",
  "Done",
] as const;
export type ProjectStatusName = (typeof PROJECT_STATUSES)[number];

export const FINDING_STATUSES = ["open", "remediated", "closed", "reopened"] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

const roleSchema = z.object({ role_id: z.number(), role_name: z.string() });

const profileSchema = z.object({
  user_id: z.number(),
  full_name: z.string(),
  phone_number: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
});

export const userSchema = z.object({
  sys_user_id: z.number(),
  username: z.string(),
  email: z.string(),
  role_id: z.number(),
  role: roleSchema.optional().nullable(),
  profile: profileSchema.optional().nullable(),
});
export type User = z.infer<typeof userSchema>;

export const statusSchema = z.object({ status_process_id: z.number(), status_name: z.string() });
export type ProjectStatus = z.infer<typeof statusSchema>;

export const assetSchema = z.object({
  assets_id: z.number(),
  asset_name: z.string(),
  asset_type: z.string(),
  mandays: z.number(),
  ip_address: z.string().optional().nullable(),
  domain: z.string().optional().nullable(),
  project_id: z.number(),
  pentest_id: z.number().optional().nullable(),
  pentester: userSchema.optional().nullable(),
});
export type Asset = z.infer<typeof assetSchema>;

export const projectSchema = z.object({
  project_id: z.number(),
  s_id: z.number().optional().nullable(),
  project_name: z.string(),
  client_name: z.string(),
  total_mandays: z.number(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status_id: z.number().optional().nullable(),
  status: statusSchema.optional().nullable(),
  pm_id: z.number(),
  pm: userSchema.optional().nullable(),
  updated_at: z.string().optional().nullable(),
});
export type Project = z.infer<typeof projectSchema>;

export const resourceSchema = z.object({
  resource_id: z.number(),
  user_id: z.number(),
  user: z
    .object({
      user_id: z.number(),
      full_name: z.string(),
      sys_user_id: z.number().optional().nullable(),
      sys_user: userSchema.optional().nullable(),
    })
    .optional()
    .nullable(),
});
export type Resource = z.infer<typeof resourceSchema>;

export const mandaysSchema = z.object({
  mandays_id: z.number(),
  asset_id: z.number(),
  pentester_id: z.number(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  allocated_mandays: z.number(),
  asset: assetSchema.optional().nullable(),
  pentester: userSchema.optional().nullable(),
});
export type Mandays = z.infer<typeof mandaysSchema>;

export const projectDetailSchema = projectSchema.extend({
  assets: z.array(assetSchema).default([]),
  resources: z.array(resourceSchema).default([]),
  mandays: z.array(mandaysSchema).default([]),
});
export type ProjectDetail = z.infer<typeof projectDetailSchema>;

export const catalogSchema = z.object({
  vulna_id: z.number(),
  title: z.string(),
  description: z.string().optional().nullable(),
  severity: z.string(),
  cvss_score: z.number().optional().nullable(),
  remediation_recommendation: z.string().optional().nullable(),
});
export type CatalogVulna = z.infer<typeof catalogSchema>;

export const evidenceSchema = z.object({
  evidence_id: z.number(),
  file_name: z.string(),
  s3_bucket: z.string(),
  s3_key: z.string(),
  s3_url: z.string().optional().nullable(),
});
export type Evidence = z.infer<typeof evidenceSchema>;

export const findingSchema = z.object({
  vulna_id: z.number(),
  custom_title: z.string(),
  severity: z.string(),
  cvss_score: z.number().optional().nullable(),
  endpoint: z.string().optional().nullable(),
  status: z.string(),
  pentester_id: z.number(),
  project_id: z.number(),
  asset_id: z.number(),
  catalog_vulna_id: z.number().optional().nullable(),
  asset: assetSchema.optional().nullable(),
  pentester: userSchema.optional().nullable(),
  evidences: z.array(evidenceSchema).optional().nullable(),
});
export type Finding = z.infer<typeof findingSchema>;

export const statusLogSchema = z.object({
  status_process_log_id: z.number(),
  status_name: z.string(),
  status_create_at: z.string(),
});

export const loginResultSchema = z.object({
  access_token: z.string(),
  expires_at: z.string(),
  user: userSchema,
});
export type LoginResult = z.infer<typeof loginResultSchema>;

export const reportSchema = z.object({
  generated_at: z.string(),
  project: projectSchema,
  assets: z.array(assetSchema),
  summary: z.object({
    total_findings: z.number(),
    by_severity: z.record(z.string(), z.number()).nullable().optional(),
    by_status: z.record(z.string(), z.number()).nullable().optional(),
  }),
  findings: z.array(findingSchema),
});
export type ProjectReport = z.infer<typeof reportSchema>;

/** Pembungkus respons BE: { success, message, data, meta, errors }. */
export function envelope<T extends z.ZodType>(data: T) {
  return z.object({
    success: z.boolean(),
    message: z.string(),
    data: data.optional().nullable(),
    meta: z.object({ page: z.number(), limit: z.number(), total: z.number() }).optional(),
    errors: z.unknown().optional(),
  });
}
