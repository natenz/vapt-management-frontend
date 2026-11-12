import { z } from "zod";
import { apiRequest } from "@/shared/api";
import { catalogSchema, type CatalogInput, type CatalogStatus } from "../model/types";

export const listCatalog = async (
  q: { search?: string; severity?: string; status?: CatalogStatus | "all"; limit?: number } = {},
) => (await apiRequest("/catalog-vulnas", { method: "GET", query: { limit: 100, ...q } }, z.array(catalogSchema))).data;

export const createCatalog = async (body: CatalogInput) =>
  (await apiRequest("/catalog-vulnas", { method: "POST", body }, catalogSchema)).data;

export const reviewCatalog = async (id: number, status: "approved" | "rejected") =>
  (await apiRequest(`/catalog-vulnas/${id}/review`, { method: "PATCH", body: { status } }, catalogSchema)).data;
