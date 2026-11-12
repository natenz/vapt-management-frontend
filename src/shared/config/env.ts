import { z } from "zod";

const apiBaseUrlSchema = z.string().trim().url().transform((value) => value.replace(/\/$/, ""));

export function getApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  const resolvedUrl = configuredUrl?.startsWith("/") ? new URL(configuredUrl, window.location.origin).toString() : configuredUrl;
  const result = apiBaseUrlSchema.safeParse(resolvedUrl);

  if (!result.success) {
    throw new Error("VITE_API_BASE_URL belum dikonfigurasi dengan URL yang valid");
  }

  return result.data;
}
