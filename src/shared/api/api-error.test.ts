import { describe, expect, it } from "vitest";
import { humanizeErrorMessage } from "./api-error";

describe("humanizeErrorMessage", () => {
  it("IP salah (format BE asli)", () => {
    expect(humanizeErrorMessage("invalid request body", { ip_address: "failed on 'ip'" })).toBe("IP address bukan IP yang valid (contoh: 192.168.1.1).");
  });

  it("field description TIDAK salah dibaca sebagai IP", () => {
    const r = humanizeErrorMessage("invalid request body", { description: "failed on 'required'" });
    expect(r).not.toContain("IP");
    expect(r).toBe("description wajib diisi.");
  });

  it("beberapa field salah sekaligus -> semuanya disebut", () => {
    const r = humanizeErrorMessage("invalid request body", { asset_type: "failed on 'required'", ip_address: "failed on 'ip'" });
    expect(r).toContain("Tipe aset wajib diisi.");
    expect(r).toContain("IP address bukan IP yang valid");
  });

  it("aturan gte/max/oneof", () => {
    expect(humanizeErrorMessage("invalid request body", { mandays: "failed on 'gte=0'" })).toBe("Mandays tidak boleh kurang dari 0.");
    expect(humanizeErrorMessage("invalid request body", { asset_name: "failed on 'max=255'" })).toBe("Nama aset maksimal 255 karakter.");
    expect(humanizeErrorMessage("invalid request body", { severity: "failed on 'oneof=Critical High'" })).toBe("Severity harus salah satu dari: Critical, High.");
  });

  it("tanpa rincian -> pesan umum, bukan teks mentah", () => {
    expect(humanizeErrorMessage("invalid request body")).not.toContain("invalid request body");
  });

  it("menerjemahkan pesan bisnis transisi status", () => {
    expect(humanizeErrorMessage("project must have at least one asset before pentest")).toBe(
      "Tambahkan minimal 1 aset sebelum proyek dapat masuk tahap Pentest.",
    );
    expect(humanizeErrorMessage("project template must have at least one resource")).toBe(
      "Proyek harus memiliki minimal 1 anggota tim sebelum diserahkan ke PM.",
    );
    expect(humanizeErrorMessage("allocated mandays exceed the asset's mandays")).toBe(
      "Mandays yang dialokasikan melebihi batas kuota mandays aset.",
    );
  });

  it("menerjemahkan pola regex dinamis aset tanpa pentester", () => {
    const res = humanizeErrorMessage("asset 'Portal Web' has no pentester assigned in the timeline");
    expect(res).toBe('Aset "Portal Web" belum ditugaskan ke pentester di timeline jadwal.');
  });

  it("400 validasi: message sudah Indonesia dan details kosong (tidak ada 'failed on')", async () => {
    const { ApiError, getErrorDetails } = await import("./api-error");
    const { apiRequest, configureHttpAuth } = await import("./http-client");
    (import.meta.env as Record<string, string>).VITE_API_BASE_URL = "http://x/api/v1";
    configureHttpAuth({ getToken: () => null, onUnauthorized: () => {} });
    const { z } = await import("zod");
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ success: false, message: "invalid request body", errors: { ip_address: "failed on 'ip'" } }), {
        status: 400,
      })) as typeof fetch;
    const err = await apiRequest("/x", { method: "POST", body: {} }, z.unknown()).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe("IP address bukan IP yang valid (contoh: 192.168.1.1).");
    expect(getErrorDetails(err)).toEqual([]);
    expect(JSON.stringify(err.details ?? "")).not.toContain("failed on");
  });
});
