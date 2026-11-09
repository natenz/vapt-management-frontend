import {
  evidenceSchema,
  findingSchema,
  reportSchema,
  SEVERITIES,
  FINDING_STATUSES,
  type Evidence,
  type Finding,
  type FindingStatus,
  type ProjectReport,
  type Severity as BackendSeverity,
} from "@/shared/api/schemas";

export { evidenceSchema, findingSchema, reportSchema, SEVERITIES, FINDING_STATUSES };
export type { Evidence, Finding, FindingStatus, ProjectReport, BackendSeverity };

export type FindingInput = {
  asset_id: number;
  catalog_vulna_id?: number;
  custom_title?: string;
  severity?: string;
  cvss_score?: number;
  endpoint?: string;
};

export type EvidenceInput = {
  file_name: string;
  s3_bucket: string;
  s3_key: string;
  s3_url?: string;
};
