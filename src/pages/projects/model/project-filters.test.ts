import { describe, expect, it } from "vitest";
import type { Project } from "@/entities/project";
import {
  EMPTY_PROJECT_FILTERS,
  applyProjectFilters,
  countActiveFilters,
  getClientOptions,
  getScheduleState,
  getStatusOptions,
  parsePageSize,
  parseProjectFilters,
  writePageSize,
  writeProjectFilters,
} from "./project-filters";

const make = (
  id: number,
  name: string,
  client: string,
  status: string,
  start: string | null,
  end: string | null,
): Project => ({
  project_id: id,
  project_name: name,
  client_name: client,
  total_mandays: 1,
  projected_mandays: 1,
  pm_id: 1,
  start_date: start,
  end_date: end,
  status: { status_process_id: id, status_name: status },
});

const today = new Date(2026, 10, 17);
const projects = [
  make(1, "VAPT Internet Banking", "Bank Telkom", "Done", "2026-01-01", "2026-01-30"),
  make(2, "VAPT Mobile Banking", "Telkom Fin", "Retesting", "2026-11-01", "2026-11-30"),
  make(3, "Audit Portal", "Bank Telkom", "Planning", "2026-12-01", "2026-12-20"),
  make(4, "Draft Tanpa Jadwal", "Telkom Fin", "Draft", null, null),
];

const ids = (list: Project[]) => list.map((p) => p.project_id);

describe("project-filters: pencocokan", () => {
  it("tanpa filter mengembalikan semua proyek", () => {
    expect(ids(applyProjectFilters(projects, EMPTY_PROJECT_FILTERS, today))).toEqual([1, 2, 3, 4]);
  });

  it("pencarian tidak peka huruf pada nama proyek dan klien", () => {
    const f = { ...EMPTY_PROJECT_FILTERS, search: "  banking " };
    expect(ids(applyProjectFilters(projects, f, today))).toEqual([1, 2]);
    expect(ids(applyProjectFilters(projects, { ...f, search: "fin" }, today))).toEqual([2, 4]);
  });

  it("filter status & klien multi-pilih digabung dengan AND antar faset", () => {
    const f = {
      ...EMPTY_PROJECT_FILTERS,
      statuses: ["Done", "Planning", "Retesting"],
      clients: ["Bank Telkom"],
    };
    expect(ids(applyProjectFilters(projects, f, today))).toEqual([1, 3]);
  });

  it("status jadwal relatif terhadap hari ini", () => {
    expect(projects.map((p) => getScheduleState(p, today))).toEqual([
      "past",
      "ongoing",
      "upcoming",
      "unscheduled",
    ]);
    const f = { ...EMPTY_PROJECT_FILTERS, schedule: "ongoing" as const };
    expect(ids(applyProjectFilters(projects, f, today))).toEqual([2]);
  });

  it("sudah berakhir hanya untuk Done; proyek lewat tenggat yang belum Done tetap berjalan", () => {
    const overdue = make(5, "Lewat Tenggat", "Bank Telkom", "Remediasi", "2026-01-01", "2026-02-01");
    const doneNoDate = make(6, "Done Tanpa Tanggal", "Bank Telkom", "Done", null, null);

    expect(getScheduleState(overdue, today)).toBe("ongoing");
    expect(getScheduleState(doneNoDate, today)).toBe("past");

    const past = { ...EMPTY_PROJECT_FILTERS, schedule: "past" as const };
    expect(ids(applyProjectFilters([...projects, overdue, doneNoDate], past, today))).toEqual([
      1, 6,
    ]);
  });
});

describe("project-filters: opsi faset", () => {
  it("status mengikuti urutan alur proyek dengan jumlahnya", () => {
    const options = getStatusOptions(projects);
    expect(options.slice(0, 2)).toEqual([
      { value: "Draft", count: 1 },
      { value: "Planning", count: 1 },
    ]);
    expect(options.at(-1)).toEqual({ value: "Done", count: 1 });
    expect(options).toHaveLength(11);
  });

  it("klien unik diurutkan alfabetis", () => {
    expect(getClientOptions(projects)).toEqual([
      { value: "Bank Telkom", count: 2 },
      { value: "Telkom Fin", count: 2 },
    ]);
  });
});

describe("project-filters: sinkronisasi URL", () => {
  it("menulis lalu membaca kembali filter tanpa kehilangan nilai", () => {
    const filters = {
      search: "bank",
      statuses: ["Planning", "Done"],
      clients: ["Bank Telkom"],
      schedule: "upcoming" as const,
    };
    const params = writeProjectFilters(filters, new URLSearchParams("tab=x"));
    expect(params.get("tab")).toBe("x");
    expect(parseProjectFilters(params)).toEqual(filters);
    expect(countActiveFilters(filters)).toBe(3);
  });

  it("nilai default dihapus dari URL dan nilai tidak valid diabaikan", () => {
    const params = writeProjectFilters(EMPTY_PROJECT_FILTERS, new URLSearchParams("q=a&jadwal=past"));
    expect(params.toString()).toBe("");
    expect(parseProjectFilters(new URLSearchParams("jadwal=kemarin")).schedule).toBe("all");
  });

  it("ukuran halaman hanya menerima opsi yang tersedia", () => {
    expect(parsePageSize(new URLSearchParams("per=50"))).toBe(50);
    expect(parsePageSize(new URLSearchParams("per=7"))).toBe(20);
    expect(writePageSize(20, new URLSearchParams("per=50")).has("per")).toBe(false);
    expect(writePageSize(100, new URLSearchParams()).get("per")).toBe("100");
  });
});
