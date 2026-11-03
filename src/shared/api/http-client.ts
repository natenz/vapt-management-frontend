import type { ZodType } from "zod";
import { ApiError } from "@/shared/api/api-error";
import { getApiBaseUrl } from "@/shared/config/env";
import { envelope } from "@/shared/api/schemas";

type Query = Record<string, string | number | boolean | null | undefined>;
type Options = Omit<RequestInit, "body" | "headers"> & {
  auth?: boolean;
  body?: unknown;
  query?: Query;
};

type AuthAdapter = { getToken: () => string | null; onUnauthorized: () => void };
let adapter: AuthAdapter | null = null;

export function configureHttpAuth(next: AuthAdapter) {
  adapter = next;
}

function buildUrl(path: string, query?: Query) {
  const url = new URL(`${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== null && value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  return url;
}

/** Respons BE selalu dibungkus; fungsi ini membuka `data` dan memvalidasinya dengan zod. */
export async function apiRequest<T>(
  path: string,
  options: Options,
  schema: ZodType<T>,
): Promise<{ data: T; meta?: { page: number; limit: number; total: number } }> {
  const { auth = true, body, query, ...init } = options;
  const headers = new Headers({ Accept: "application/json" });
  if (body !== undefined) headers.set("Content-Type", "application/json");
  const token = auth ? adapter?.getToken() : null;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...init,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Tidak dapat terhubung ke server. Periksa koneksi dan konfigurasi API.");
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    /* respons tanpa body JSON */
  }

  if (!response.ok) {
    if (response.status === 401 && auth) adapter?.onUnauthorized();
    const p = payload as { message?: string; errors?: unknown } | null;
    throw new ApiError(
      p?.message ?? `Permintaan gagal dengan status ${response.status}`,
      response.status,
      p?.errors && typeof p.errors === "object" ? Object.entries(p.errors).map(([k, v]) => `${k}: ${String(v)}`) : undefined,
    );
  }

  const parsed = envelope(schema).safeParse(payload);
  if (!parsed.success) {
    throw new ApiError("Respons server tidak sesuai kontrak API", 502, parsed.error.issues);
  }
  return { data: parsed.data.data as T, meta: parsed.data.meta };
}
