import { z } from "zod";
import { apiRequest } from "@/shared/api";
import {
  assetSchema,
  mandaysSchema,
  projectDetailSchema,
  projectSchema,
  projectStageSchema,
  resourceSchema,
  statusLogSchema,
  statusSchema,
  type AssetInput,
  type CreateProjectInput,
  type MandaysInput,
  type ResourceLoad,
  type StageScheduleInput,
} from "../model/types";
import { aggregateLoad } from "../model/load";

export const listStatuses = async () =>
  (await apiRequest("/statuses", { method: "GET" }, z.array(statusSchema))).data;

export const listProjects = async (q: { status_id?: number; search?: string; page?: number; limit?: number } = {}) =>
  apiRequest("/projects", { method: "GET", query: q }, z.array(projectSchema));

export const getProject = async (id: number) =>
  (await apiRequest(`/projects/${id}`, { method: "GET" }, projectDetailSchema)).data;

export const createProject = async (body: CreateProjectInput) =>
  (await apiRequest("/projects", { method: "POST", body }, projectDetailSchema)).data;

export const changeProjectStatus = async (id: number, status_id: number) =>
  (await apiRequest(`/projects/${id}/status`, { method: "PATCH", body: { status_id } }, projectDetailSchema)).data;

export const listStatusLogs = async (id: number) =>
  (await apiRequest(`/projects/${id}/status-logs`, { method: "GET" }, z.array(statusLogSchema))).data;

export const listResources = async (id: number) =>
  (await apiRequest(`/projects/${id}/resources`, { method: "GET" }, z.array(resourceSchema))).data;

export const addResources = async (id: number, user_ids: number[]) =>
  (await apiRequest(`/projects/${id}/resources`, { method: "POST", body: { user_ids } }, z.array(resourceSchema))).data;

export const listAssets = async (id: number) =>
  (await apiRequest(`/projects/${id}/assets`, { method: "GET" }, z.array(assetSchema))).data;

export const listMandays = async (id: number) =>
  (await apiRequest(`/projects/${id}/mandays`, { method: "GET" }, z.array(mandaysSchema))).data;

export const createMandays = async (id: number, body: MandaysInput) =>
  (await apiRequest(`/projects/${id}/mandays`, { method: "POST", body }, mandaysSchema)).data;

export const updateMandays = async (
  id: number,
  body: Partial<Pick<MandaysInput, "status" | "allocated_mandays" | "pentester_id" | "start_date" | "end_date">>,
) =>
  (await apiRequest(`/mandays/${id}`, { method: "PUT", body }, mandaysSchema)).data;

export const deleteMandays = async (id: number) =>
  (await apiRequest(`/mandays/${id}`, { method: "DELETE" }, z.unknown())).data;

export const createAsset = async (id: number, body: AssetInput) =>
  (await apiRequest(`/projects/${id}/assets`, { method: "POST", body }, assetSchema)).data;

export const updateAsset = async (id: number, body: Partial<AssetInput>) =>
  (await apiRequest(`/assets/${id}`, { method: "PUT", body }, assetSchema)).data;

export const deleteAsset = async (assetId: number) =>
  (await apiRequest(`/assets/${assetId}`, { method: "DELETE" }, z.unknown())).data;

export const updateProjectStages = async (id: number, stages: StageScheduleInput[]) =>
  (await apiRequest(`/projects/${id}/stages`, { method: "PUT", body: { stages } }, z.array(projectStageSchema))).data;

/**
 * Beban + proyek aktif tiap orang (key = sys_user_id) dari proyek yang belum Done.
 * ponytail: BE belum punya endpoint beban kerja, jadi 1 request list + 1 request detail per proyek.
 * Cukup untuk puluhan proyek; kalau lambat, minta BE tambah GET /workload lalu ganti isi fungsi ini.
 */
export const getResourceLoad = async (): Promise<Record<number, ResourceLoad>> => {
  const { data: projects } = await listProjects({ limit: 100 });
  const active = projects.filter((p) => p.status?.status_name !== "Done");
  const details = await Promise.all(active.map((p) => getProject(p.project_id)));
  return aggregateLoad(details);
};

/**
 * Beban mandays per pentester (key = sys_user_id), dijumlah dari trx_mandays lintas proyek yang belum Done.
 * ponytail: BE belum punya endpoint beban kerja, jadi ini 1 request list + 1 request mandays per proyek.
 * Cukup untuk puluhan proyek; kalau lambat, minta BE tambah GET /workload lalu ganti isi fungsi ini.
 */
export const getWorkload = async (): Promise<Record<number, number>> => {
  const { data: projects } = await listProjects({ limit: 100 });
  const active = projects.filter((p) => p.status?.status_name !== "Done");
  const lists = await Promise.all(active.map((p) => listMandays(p.project_id)));
  const total: Record<number, number> = {};
  for (const m of lists.flat()) total[m.pentester_id] = (total[m.pentester_id] ?? 0) + m.allocated_mandays;
  return total;
};
