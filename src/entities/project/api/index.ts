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
import { aggregateLoad, currentMonth } from "../model/load";

export const listStatuses = async () =>
  (await apiRequest("/statuses", { method: "GET" }, z.array(statusSchema))).data;

export const listProjects = async (
  q: { status_id?: number; search?: string; page?: number; limit?: number } = {},
) => apiRequest("/projects", { method: "GET", query: q }, z.array(projectSchema));

/**
 * Mengambil seluruh proyek dengan menangani paginasi backend secara transparan.
 * Memastikan grafik ikhtisar jadwal dan tabel menerima seluruh data proyek yang relevan.
 */
export const listAllProjects = async (): Promise<{
  data: z.infer<typeof projectSchema>[];
  meta?: { page: number; limit: number; total: number };
}> => {
  const firstPage = await listProjects({ page: 1, limit: 100 });
  const total = firstPage.meta?.total ?? firstPage.data.length;
  const limit = firstPage.meta?.limit ?? 100;

  if (total <= firstPage.data.length || limit <= 0) {
    return firstPage;
  }

  const totalPages = Math.ceil(total / limit);
  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) => listProjects({ page: i + 2, limit })),
  );

  const allProjects = [...firstPage.data, ...remainingPages.flatMap((res) => res.data)];

  return {
    data: allProjects,
    meta: {
      page: 1,
      limit: allProjects.length,
      total,
    },
  };
};

export const getProject = async (id: number) =>
  (await apiRequest(`/projects/${id}`, { method: "GET" }, projectDetailSchema)).data;

export const createProject = async (body: CreateProjectInput) =>
  (await apiRequest("/projects", { method: "POST", body }, projectDetailSchema)).data;

export const changeProjectStatus = async (id: number, status_id: number) =>
  (
    await apiRequest(
      `/projects/${id}/status`,
      { method: "PATCH", body: { status_id } },
      projectDetailSchema,
    )
  ).data;

export const listStatusLogs = async (id: number) =>
  (await apiRequest(`/projects/${id}/status-logs`, { method: "GET" }, z.array(statusLogSchema)))
    .data;

export const listResources = async (id: number) =>
  (await apiRequest(`/projects/${id}/resources`, { method: "GET" }, z.array(resourceSchema))).data;

export const addResources = async (id: number, user_ids: number[]) =>
  (
    await apiRequest(
      `/projects/${id}/resources`,
      { method: "POST", body: { user_ids } },
      z.array(resourceSchema),
    )
  ).data;

export const removeResource = async (id: number, resourceId: number) =>
  (await apiRequest(`/projects/${id}/resources/${resourceId}`, { method: "DELETE" }, z.unknown()))
    .data;

export const listAssets = async (id: number) =>
  (await apiRequest(`/projects/${id}/assets`, { method: "GET" }, z.array(assetSchema))).data;

export const listMandays = async (id: number) =>
  (await apiRequest(`/projects/${id}/mandays`, { method: "GET" }, z.array(mandaysSchema))).data;

export const createMandays = async (id: number, body: MandaysInput) =>
  (await apiRequest(`/projects/${id}/mandays`, { method: "POST", body }, mandaysSchema)).data;

export const updateMandays = async (
  id: number,
  body: Partial<
    Pick<MandaysInput, "status" | "allocated_mandays" | "pentester_id" | "start_date" | "end_date">
  >,
) => (await apiRequest(`/mandays/${id}`, { method: "PUT", body }, mandaysSchema)).data;

export const deleteMandays = async (id: number) =>
  (await apiRequest(`/mandays/${id}`, { method: "DELETE" }, z.unknown())).data;

export const createAsset = async (id: number, body: AssetInput) =>
  (await apiRequest(`/projects/${id}/assets`, { method: "POST", body }, assetSchema)).data;

export const updateAsset = async (id: number, body: Partial<AssetInput>) =>
  (await apiRequest(`/assets/${id}`, { method: "PUT", body }, assetSchema)).data;

export const deleteAsset = async (assetId: number) =>
  (await apiRequest(`/assets/${assetId}`, { method: "DELETE" }, z.unknown())).data;

export const updateProjectStages = async (id: number, stages: StageScheduleInput[]) =>
  (
    await apiRequest(
      `/projects/${id}/stages`,
      { method: "PUT", body: { stages } },
      z.array(projectStageSchema),
    )
  ).data;

/**
 * Beban + proyek aktif tiap orang (key = sys_user_id) pada bulan `ym` ("YYYY-MM", bawaan bulan ini); mandays
 * reset tiap bulan karena hanya porsi penugasan di bulan itu yang dihitung.
 * ponytail: BE belum punya endpoint beban kerja, jadi 1 request list + 1 request detail per proyek yang relevan
 * (belum Done, atau jadwalnya menyentuh bulan itu). Cukup untuk puluhan proyek; kalau lambat, minta BE tambah GET /workload.
 */
export const getResourceLoad = async (
  ym: string = currentMonth(),
): Promise<Record<number, ResourceLoad>> => {
  const { data: projects } = await listProjects({ limit: 100 });
  const day = (v?: string | null) => (v ?? "").slice(0, 7);
  const relevant = projects.filter(
    (p) => p.status?.status_name !== "Done" || (day(p.start_date) <= ym && ym <= day(p.end_date)),
  );
  const details = await Promise.all(relevant.map((p) => getProject(p.project_id)));
  return aggregateLoad(details, ym);
};

/** Mandays per pentester (key = sys_user_id) pada bulan `ym`; dipakai picker tim. */
export const getWorkload = async (ym: string = currentMonth()): Promise<Record<number, number>> =>
  Object.fromEntries(Object.entries(await getResourceLoad(ym)).map(([id, l]) => [id, l.mandays]));
