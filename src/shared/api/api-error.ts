export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status = 0, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui";
}

/**
 * Rincian `ApiError.details` sebagai baris yang bisa dibaca: pesan validasi
 * backend ("scoring: Required") atau issue Zod saat respons tidak sesuai
 * kontrak ("data.logs.2.logProjectStatus: Invalid input"). Kosong bila tidak ada.
 */
export function getErrorDetails(error: unknown): string[] {
  if (!(error instanceof ApiError) || !Array.isArray(error.details)) return [];
  return error.details
    .map((item: unknown) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const { path, field, message } = item as {
          path?: unknown;
          field?: unknown;
          message?: unknown;
        };
        const where = Array.isArray(path) ? path.join(".") : (field ?? path);
        if (typeof message === "string") return where ? `${String(where)}: ${message}` : message;
      }
      return null;
    })
    .filter((line): line is string => Boolean(line));
}
