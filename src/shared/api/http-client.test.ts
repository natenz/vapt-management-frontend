import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { apiBlobRequest, apiRequest, configureHttpAuth } from "./http-client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  configureHttpAuth({ getToken: () => null, onUnauthorized: () => {} });
});

describe("permintaan evidence", () => {
  it("mengirim berkas multipart utuh dengan token tanpa menimpa boundary", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost/api/v1");
    configureHttpAuth({ getToken: () => "test-token", onUnauthorized: () => {} });
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ success: true, message: "Tersimpan", data: { evidence_id: 1 } }), { status: 201 }));
    vi.stubGlobal("fetch", fetcher);
    const photo = new File(["png"], "foto.png", { type: "image/png" });
    const body = new FormData();
    body.append("file", photo);
    await apiRequest("/vulnas/2/evidences/upload", { method: "POST", body }, z.object({ evidence_id: z.number() }));
    const [url, init] = (fetcher.mock.calls as unknown as [URL, RequestInit][])[0]!;
    expect(url.pathname).toBe("/api/v1/vulnas/2/evidences/upload");
    expect(init.body).toBe(body);
    expect((init.body as FormData).get("file")).toBe(photo);
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer test-token");
    expect(new Headers(init.headers).has("Content-Type")).toBe(false);
  });

  it("meminta foto dengan token dan menghapus sesi saat token ditolak", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost/api/v1");
    const unauthorized = vi.fn();
    configureHttpAuth({ getToken: () => "test-token", onUnauthorized: unauthorized });
    const fetcher = vi.fn(async () => new Response("", { status: 401 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(apiBlobRequest("/evidences/1/file")).rejects.toThrow("Foto evidence tidak dapat dimuat");
    const init = (fetcher.mock.calls as unknown as [URL, RequestInit][])[0]![1];
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer test-token");
    expect(unauthorized).toHaveBeenCalledOnce();
  });
});
