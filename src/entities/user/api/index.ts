import { z } from "zod";
import { apiRequest } from "@/shared/api";
import { userSchema, roleDetailSchema, type CreateUserInput } from "../model/types";

export const listUsers = async (q: { role?: string; search?: string; limit?: number } = {}) =>
  (await apiRequest("/users", { method: "GET", query: { limit: 100, ...q } }, z.array(userSchema))).data;

export const createUser = async (body: CreateUserInput) =>
  (await apiRequest("/users", { method: "POST", body }, userSchema)).data;

export const listRoles = async () =>
  (await apiRequest("/roles", { method: "GET" }, z.array(roleDetailSchema))).data;
