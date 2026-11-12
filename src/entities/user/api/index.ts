import { z } from "zod";
import { apiRequest } from "@/shared/api";
import { userSchema, roleDetailSchema, type CreateUserInput, type UpdateUserInput } from "../model/types";

export const listUsers = async (q: { role?: string; search?: string; limit?: number } = {}) =>
  (await apiRequest("/users", { method: "GET", query: { limit: 100, ...q } }, z.array(userSchema))).data;

export const getUser = async (id: number) =>
  (await apiRequest(`/users/${id}`, { method: "GET" }, userSchema)).data;

export const createUser = async (body: CreateUserInput) =>
  (await apiRequest("/users", { method: "POST", body }, userSchema)).data;

export const updateUser = async (id: number, body: UpdateUserInput) =>
  (await apiRequest(`/users/${id}`, { method: "PUT", body }, userSchema)).data;

export const deleteUser = async (id: number) =>
  (await apiRequest(`/users/${id}`, { method: "DELETE" }, z.unknown().optional())).data;

export const listRoles = async () =>
  (await apiRequest("/roles", { method: "GET" }, z.array(roleDetailSchema))).data;
