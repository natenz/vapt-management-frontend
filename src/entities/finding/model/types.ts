import {
  evidenceSchema,
  exposureSchema,
  findingSchema,
  reportSchema,
  SEVERITIES,
  FINDING_STATUSES,
  type Evidence,
  type Exposure,
  type Finding,
  type FindingStatus,
  type ProjectReport,
  type Severity as BackendSeverity,
} from "@/shared/api/schemas";

export { evidenceSchema, exposureSchema, findingSchema, reportSchema, SEVERITIES, FINDING_STATUSES };
export type { Evidence, Exposure, Finding, FindingStatus, ProjectReport, BackendSeverity };

export type FindingInput = {
  app_name?: string;
  ip_domain?: string;
  platform?: string;
  object_source?: string;
  tools?: string;
  owasp_mobile_2024?: string;
  status?: FindingStatus;
  status_note?: string;
  device_name?: string;
  ip_address?: string;
  test_scenario?: string;
  description?: string;
  impact?: string;
  recommendation?: string;
  references?: string;
  cwe?: string;
  pentester_note?: string;
  asset_id: number;
  /** Kosong = kode otomatis dari BE (<kode proyek>-<severity>-<nomor>). */
  finding_code?: string;
  catalog_vulna_id?: number;
  custom_title?: string;
  severity?: string;
  cvss_score?: string;
  endpoint?: string;
};

export type EvidenceInput = {
  file_name: string;
  s3_bucket: string;
  s3_key: string;
  s3_url?: string;
};
