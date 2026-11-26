import { z } from "zod";
import { apiBlobRequest, apiRequest } from "@/shared/api";
import {
  evidenceSchema,
  exposureSchema,
  findingSchema,
  reportSchema,
  type EvidenceInput,
  type FindingInput,
  type FindingStatus,
} from "../model/types";

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

/** Ubah status temuan; `note` opsional (tidak dikirim = catatan lama tetap, "" = hapus catatan). */
export const changeFindingStatus = async (id: number, status: FindingStatus, note?: string) =>
  (await apiRequest(`/vulnas/${id}/status`, { method: "PATCH", body: { status, note } }, findingSchema)).data;

export const deleteFinding = async (id: number) =>
  (await apiRequest(`/vulnas/${id}`, { method: "DELETE" }, z.unknown())).data;

export const addEvidence = async (id: number, body: EvidenceInput) =>
  (await apiRequest(`/vulnas/${id}/evidences`, { method: "POST", body }, evidenceSchema)).data;

/** Temuan open lintas proyek per severity (super admin dan tech lead). */
export const getExposure = async () =>
  (await apiRequest("/dashboard/exposure", { method: "GET" }, exposureSchema)).data;

export const getReport = async (projectId: number) =>
  (await apiRequest(`/projects/${projectId}/report`, { method: "GET" }, reportSchema)).data;

export const downloadReportDocx = (projectId: number, assetId?: number, signal?: AbortSignal) =>
  apiBlobRequest(`/projects/${projectId}/report.docx`, {
    query: { asset_id: assetId },
    accept: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    errorMessage: "Report DOCX tidak dapat diunduh",
    signal,
  });

export const uploadEvidence = async (id: number, file: File) => {
  const body = new FormData();
  body.append("file", file);
  return (await apiRequest(`/vulnas/${id}/evidences/upload`, { method: "POST", body }, evidenceSchema)).data;
};

export const getEvidencePhoto = (id: number) => apiBlobRequest(`/evidences/${id}/file`);
