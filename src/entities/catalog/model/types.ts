import { catalogSchema, type CatalogVulna } from "@/shared/api/schemas";

export { catalogSchema };
export type { CatalogVulna };

export type CatalogStatus = "approved" | "pending" | "rejected";

export type CatalogInput = {
  title: string;
  description?: string;
  severity: string;
  cvss_score?: number;
  remediation_recommendation?: string;
};
