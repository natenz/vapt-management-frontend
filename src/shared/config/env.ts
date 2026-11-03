import { z } from "zod";

const apiBaseUrlSchema = z
  .string()
  .trim()
  .url()
  .transform((value) => value.replace(/\/$/, ""));

export function getApiBaseUrl() {
  const result = apiBaseUrlSchema.safeParse(import.meta.env.VITE_API_BASE_URL);

  if (!result.success) {
    throw new Error("VITE_API_BASE_URL belum dikonfigurasi dengan URL yang valid");
  }

  return result.data;
}
