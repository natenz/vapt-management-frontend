import { apiRequest } from "@/shared/api";
import { loginResultSchema, userSchema } from "@/shared/api/schemas";

export const login = async (body: { login: string; password: string }) =>
  (await apiRequest("/auth/login", { method: "POST", body, auth: false }, loginResultSchema)).data;

export const me = async () => (await apiRequest("/auth/me", { method: "GET" }, userSchema)).data;
