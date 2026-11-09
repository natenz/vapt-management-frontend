import type { z } from "zod";
import {
  assetSchema,
  mandaysSchema,
  projectDetailSchema,
  projectSchema,
  resourceSchema,
  statusLogSchema,
  statusSchema,
  PROJECT_STATUSES,
  type Asset,
  type Mandays,
  type Project,
  type ProjectDetail,
  type ProjectStatus,
  type ProjectStatusName,
  type Resource,
} from "@/shared/api/schemas";

export {
  assetSchema,
  mandaysSchema,
  projectDetailSchema,
  projectSchema,
  resourceSchema,
  statusLogSchema,
  statusSchema,
  PROJECT_STATUSES,
};

export type {
  Asset,
  Mandays,
  Project,
  ProjectDetail,
  ProjectStatus,
  ProjectStatusName,
  Resource,
};

export type StatusLog = z.infer<typeof statusLogSchema>;

export type AssetInput = {
  asset_name: string;
  asset_type: string;
  mandays: number;
  ip_address?: string;
  domain?: string;
};

export type CreateProjectInput = {
  project_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  pm_id: number;
  assets: AssetInput[];
  resource_user_ids: number[];
};

export type MandaysInput = {
  asset_id: number;
  pentester_id: number;
  start_date: string;
  end_date: string;
  allocated_mandays: number;
  status?: "planned" | "in_progress" | "done";
};
