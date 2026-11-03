import { z } from "zod";
import { apiRequest } from "@/shared/api";
import { evidenceSchema, findingSchema, reportSchema, type FindingStatus } from "@/shared/api/schemas";

export type FindingInput = {
  asset_id: number;
  catalog_vulna_id?: number;
  custom_title?: string;
  severity?: string;
  cvss_score?: number;
  endpoint?: string;
};

export const listFindings = async (
  projectId: number,
  q: { asset_id?: number; severity?: string; status?: string } = {},
) => (await apiRequest(`/projects/${projectId}/vulnas`, { method: "GET", query: q }, z.array(findingSchema))).data;

export const getFinding = async (id: number) =>
  (await apiRequest(`/vulnas/${id}`, { method: "GET" }, findingSchema)).data;

export const createFinding = async (projectId: number, body: FindingInput) =>
  (await apiRequest(`/projects/${projectId}/vulnas`, { method: "POST", body }, findingSchema)).data;

export const updateFinding = async (id: number, body: Partial<FindingInput>) =>
  (await apiRequest(`/vulnas/${id}`, { method: "PUT", body }, findingSchema)).data;

export const changeFindingStatus = async (id: number, status: FindingStatus) =>
  (await apiRequest(`/vulnas/${id}/status`, { method: "PATCH", body: { status } }, findingSchema)).data;

export type EvidenceInput = { file_name: string; s3_bucket: string; s3_key: string; s3_url?: string };
export const addEvidence = async (id: number, body: EvidenceInput) =>
  (await apiRequest(`/vulnas/${id}/evidences`, { method: "POST", body }, evidenceSchema)).data;

export const getReport = async (projectId: number) =>
  (await apiRequest(`/projects/${projectId}/report`, { method: "GET" }, reportSchema)).data;
