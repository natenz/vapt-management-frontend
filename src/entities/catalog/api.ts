import { z } from "zod";
import { apiRequest } from "@/shared/api";
import { catalogSchema } from "@/shared/api/schemas";

export type CatalogInput = {
  title: string;
  description?: string;
  severity: string;
  cvss_score?: number;
  remediation_recommendation?: string;
};

export const listCatalog = async (q: { search?: string; severity?: string; limit?: number } = {}) =>
  (await apiRequest("/catalog-vulnas", { method: "GET", query: { limit: 100, ...q } }, z.array(catalogSchema))).data;

export const createCatalog = async (body: CatalogInput) =>
  (await apiRequest("/catalog-vulnas", { method: "POST", body }, catalogSchema)).data;
