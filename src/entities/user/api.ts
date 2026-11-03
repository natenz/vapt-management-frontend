import { z } from "zod";
import { apiRequest } from "@/shared/api";
import { userSchema } from "@/shared/api/schemas";

export const listUsers = async (q: { role?: string; search?: string; limit?: number } = {}) =>
  (await apiRequest("/users", { method: "GET", query: { limit: 100, ...q } }, z.array(userSchema))).data;

export type CreateUserInput = {
  username: string;
  email: string;
  password: string;
  role_id: number;
  full_name: string;
  phone_number?: string;
  department?: string;
};
export const createUser = async (body: CreateUserInput) =>
  (await apiRequest("/users", { method: "POST", body }, userSchema)).data;

const roleSchema = z.object({ role_id: z.number(), role_name: z.string(), permissions: z.string().optional().nullable(), description: z.string().optional().nullable() });
export const listRoles = async () => (await apiRequest("/roles", { method: "GET" }, z.array(roleSchema))).data;
