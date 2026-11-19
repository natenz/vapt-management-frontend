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

// Nama field BE (snake_case, persis seperti di tag json DTO) -> label yang dipahami user.
const FIELD_LABEL: Record<string, string> = {
  asset_name: "Nama asset",
  asset_type: "Tipe asset",
  ip_address: "IP address",
  domain: "Domain",
  mandays: "Mandays",
  allocated_mandays: "Mandays",
  start_date: "Tanggal mulai",
  end_date: "Tanggal selesai",
  project_name: "Nama proyek",
  client_name: "Nama klien",
  custom_title: "Judul finding",
  severity: "Severity",
  cvss_score: "CVSS score",
  asset_id: "Asset",
  pentester_id: "Pentester",
};

/** rule = "failed on 'ip'" / "'required'" / "'gte=0'" / "'max=255'" -> kalimat Indonesia. */
function describeField(field: string, rule: string): string {
  const label = FIELD_LABEL[field] ?? field.replace(/_/g, " ");
  const tag = /'([^']+)'/.exec(rule)?.[1] ?? rule;
  const [name, param] = tag.split("=");
  switch (name) {
    case "required": return `${label} wajib diisi.`;
    case "ip": return `${label} bukan IP yang valid (contoh: 192.168.1.1).`;
    case "gt": return `${label} harus lebih dari ${param}.`;
    case "gte": return `${label} tidak boleh kurang dari ${param}.`;
    case "lte": return `${label} tidak boleh lebih dari ${param}.`;
    case "min": return `${label} minimal ${param}.`;
    case "max": return `${label} maksimal ${param} karakter.`;
    case "oneof": return `${label} harus salah satu dari: ${(param ?? "").split(" ").join(", ")}.`;
    default: return `${label} tidak valid.`;
  }
}

/**
 * Menerjemahkan pesan error teknis backend (Go/Gin/SQL/Validator) menjadi
 * kalimat Bahasa Indonesia yang jelas, kontekstual, dan mudah dipahami pengguna.
 */
export function humanizeErrorMessage(rawMessage: string, rawErrors?: unknown): string {
  const msg = rawMessage.trim();

  // 1. Validasi form BE: {"errors": {"ip_address": "failed on 'ip'"}}. Satu kalimat per field yang salah.
  if (/^invalid (request body|query)/i.test(msg)) {
    const lines =
      rawErrors && typeof rawErrors === "object"
        ? Object.entries(rawErrors).map(([field, rule]) => describeField(field, String(rule)))
        : [];
    return lines.length > 0 ? lines.join(" ") : "Ada isian yang belum lengkap atau formatnya belum pas. Coba cek lagi isiannya.";
  }

  // 2. Pemetaan pesan error bisnis spesifik dari backend (apperror)
  const translations: Record<string, string> = {
    "project template must have at least one asset": "Proyek harus punya minimal 1 asset sebelum diserahkan ke PM.",
    "project template must have at least one resource": "Proyek harus punya minimal 1 anggota tim sebelum diserahkan ke PM.",
    "project must have at least one asset before pentest": "Tambahkan minimal 1 asset dulu sebelum proyek masuk tahap Assessment.",
    "asset does not belong to this project": "Asset yang dipilih bukan milik proyek ini.",
    "pentester not found": "Pentester yang dipilih tidak ketemu.",
    "pentester_id must be a user with role pentester": "User yang dipilih harus berperan sebagai Pentester.",
    "pentester is not assigned as a resource of this project": "Pentester ini belum jadi anggota tim proyek ini.",
    "mandays dates must be within the project date range": "Tanggal pengujian harus ada di dalam tanggal proyek.",
    "end_date must be on or after start_date": "Tanggal selesai tidak boleh sebelum tanggal mulai.",
    "allocated mandays exceed the asset's mandays": "Mandays yang dibagikan lebih besar dari mandays asset.",
    "asset mandays cannot be lower than mandays already allocated": "Mandays asset tidak boleh lebih kecil dari mandays yang sudah dibagikan ke pentester.",
    "invalid username/email or password": "Username, email, atau password salah.",
    "old password is incorrect": "Password lama tidak sesuai.",
    "username or email already used": "Username atau email itu sudah dipakai.",
    "you cannot delete your own account": "Kamu tidak bisa menghapus akunmu sendiri.",
    "user not found": "Pengguna tidak ditemukan.",
    "role not found": "Role yang dipilih tidak ditemukan.",
    "user is referenced by projects, mandays, findings or evidence and cannot be deleted": "Pengguna masih terkait dengan proyek, jadwal, findings, atau bukti pengujian sehingga tidak dapat dihapus.",
    "only the tech lead can reassign the pm": "Cuma Tech Lead yang bisa mengganti Project Manager.",
    "only the tech lead can submit the project template to the pm": "Cuma Tech Lead yang bisa menyerahkan proyek ke Project Manager.",
    "only the tech lead or super admin can delete projects": "Cuma Tech Lead atau Super Admin yang bisa menghapus proyek.",
    "only the tech lead or the project's pm can manage this project": "Cuma Tech Lead atau PM pemilik proyek yang bisa mengatur proyek ini.",
    "only pentesters can record findings": "Cuma Pentester yang bisa mencatat finding.",
    "only pentesters can upload evidence": "Cuma Pentester yang bisa mengunggah bukti (evidence).",
    "only pentesters can verify remediation": "Cuma Pentester yang bisa mengecek ulang hasil perbaikan.",
    "custom_title is required when catalog_vulna_id is not set": "Judul finding wajib diisi jika tidak memilih dari vulnerability catalog.",
    "severity is required when catalog_vulna_id is not set": "Tingkat keparahan (severity) wajib dipilih jika tidak memilih dari catalog.",
    "finding not found": "Finding tidak ditemukan.",
    "evidence not found": "File bukti (evidence) tidak ditemukan.",
    "project not found": "Proyek tidak ditemukan.",
    "resource not found": "Anggota tim tidak ditemukan.",
    "you cannot edit this finding": "Kamu tidak bisa mengedit finding ini.",
    "you cannot delete this finding": "Kamu tidak bisa menghapus finding ini.",
    "you cannot delete this evidence": "Kamu tidak bisa menghapus file bukti ini.",
    "unauthorized": "Sesimu sudah habis. Silakan login lagi.",
    "forbidden": "Kamu tidak punya akses untuk aksi ini.",
  };

  const lookup = translations[msg.toLowerCase()];
  if (lookup) {
    return lookup;
  }

  // 3. Pola dinamis regex
  const unassignedAssetMatch = msg.match(/^asset ['"]([^'"]+)['"] has no pentester assigned in the timeline$/i);
  if (unassignedAssetMatch) {
    return `Asset "${unassignedAssetMatch[1]}" belum dibagikan ke pentester di jadwal.`;
  }

  const statusChangeMatch = msg.match(/^cannot change status from (.+) to (.+)$/i);
  if (statusChangeMatch) {
    return `Status proyek tidak bisa loncat dari ${statusChangeMatch[1]} langsung ke ${statusChangeMatch[2]}.`;
  }

  const statusActionMatch = msg.match(/^action not allowed while project status is (.+)$/i);
  if (statusActionMatch) {
    return `Aksi ini belum bisa dilakukan saat proyek masih di tahap ${statusActionMatch[1]}.`;
  }

  return msg;
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
