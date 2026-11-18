import { fireEvent, render, screen, within } from "@testing-library/react";
import { useEffect, type ComponentType, type ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "@/entities/project";
import { getDefaultScheduleRangeValue } from "@/features/schedule-range";
import { ProjectTimeline } from "./project-timeline";

/*
 * SVAR Gantt bergantung pada layout & ResizeObserver yang tidak tersedia di
 * jsdom. Di sini digantikan stub ringan yang merender setiap task memakai
 * taskTemplate asli, sehingga adapter, warna, dan klik batang tetap teruji.
 */
vi.mock("@svar-ui/react-gantt", () => ({
  Willow: ({ children }: { children: ReactNode }) => <div data-testid="willow">{children}</div>,
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  locateTask: (ev: MouseEvent) => {
    const node = (ev.target as HTMLElement).closest("[data-id]");
    return node ? { id: node.getAttribute("data-id"), node } : null;
  },
  Gantt: ({
    tasks,
    taskTemplate: Bar,
    init,
  }: {
    tasks: { id: string; parent?: string }[];
    taskTemplate: ComponentType<{ data: unknown }>;
    init?: (api: unknown) => void;
  }) => {
    // API minimal yang dipakai widget; init dipanggil sekali saat mount seperti SVAR
    useEffect(() => {
      init?.({
        on: () => {},
        exec: () => {},
        getTask: (id: string) => tasks.find((t) => t.id === id),
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
      <div data-testid="gantt">
        {tasks.map((t) => {
          if ((t as unknown as { kind?: string }).kind === "empty") return null;
          return (
            <div key={t.id} className="wx-bar" data-id={t.id} data-parent={t.parent ?? ""}>
              <Bar data={t} />
            </div>
          );
        })}
      </div>
    );
  },
}));
vi.mock("@svar-ui/react-gantt/all.css", () => ({}));

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const make = (
  id: number,
  name: string,
  start: string | null,
  end: string | null,
  status: string,
  pm: string,
): Project => ({
  project_id: id,
  project_name: name,
  client_name: `Klien ${id}`,
  total_mandays: 0,
  projected_mandays: 0,
  pm_id: id,
  start_date: start,
  end_date: end,
  status: { status_process_id: id, status_name: status },
  pm: { sys_user_id: id, username: pm.toLowerCase(), profile: { full_name: pm } } as Project["pm"],
});

const projects: Project[] = [
  make(1, "Pentest Portal", "2026-02-01", "2026-03-15", "Assessment", "Andi"),
  make(2, "Audit API", "2026-05-01", "2026-06-30", "Done", "Sari"),
  make(3, "Proyek Lama", "2024-01-01", "2024-02-01", "Done", "Sari"),
  make(4, "Tanpa Jadwal", null, null, "Draft", "Andi"),
];

function renderTimeline(props: Partial<Parameters<typeof ProjectTimeline>[0]> = {}) {
  const onScheduleChange = vi.fn();
  render(
    <MemoryRouter initialEntries={["/projects"]}>
      <Routes>
        <Route
          path="/projects"
          element={
            <ProjectTimeline
              projects={projects}
              schedule={getDefaultScheduleRangeValue()}
              onScheduleChange={onScheduleChange}
              {...props}
            />
          }
        />
        <Route path="/projects/:id" element={<p>Detail proyek</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return { onScheduleChange };
}

const bars = () => screen.getAllByTestId("gantt")[0]!.querySelectorAll(".wx-bar");

describe("ProjectTimeline", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 17, 10, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("menampilkan proyek terjadwal di rentang aktif dan info proyek tanpa jadwal", () => {
    renderTimeline();
    const gantt = screen.getByTestId("gantt");
    expect(within(gantt).getByText("Pentest Portal")).toBeInTheDocument();
    expect(within(gantt).getByText("Audit API")).toBeInTheDocument();
    // Di luar rentang 2026 & tanpa jadwal tidak digambar
    expect(within(gantt).queryByText("Proyek Lama")).toBeNull();
    expect(within(gantt).queryByText("Tanpa Jadwal")).toBeNull();
    expect(screen.getByText("2 proyek pada rentang ini")).toBeInTheDocument();
    expect(screen.getByText(/1 proyek belum memiliki jadwal valid/)).toBeInTheDocument();
  });

  it("warna batang mengikuti status, termasuk varian tema gelap", () => {
    renderTimeline();
    const done = within(screen.getByTestId("gantt")).getByText("Audit API").parentElement!;
    expect(done).toHaveClass("bg-emerald-100", "dark:bg-emerald-400/20");
  });

  it("pencarian menyaring batang", () => {
    renderTimeline();
    fireEvent.change(screen.getByRole("searchbox", { name: "Cari proyek di timeline" }), {
      target: { value: "audit" },
    });
    expect(bars()).toHaveLength(1);
  });

  it("grup berdasarkan status membuat baris induk", async () => {
    renderTimeline();
    fireEvent.pointerDown(screen.getByRole("button", { name: "Grup" }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.click(await screen.findByRole("menuitemcheckbox", { name: "Status" }));
    const ids = [...bars()].map((b) => b.getAttribute("data-id"));
    expect(ids).toEqual(["group:status:Assessment", "project:1", "group:status:Done", "project:2"]);
  });

  it("tooltip menampilkan nama, klien, tanggal, status, dan PM", () => {
    renderTimeline();
    const chart = document.querySelector('[data-slot="project-timeline-chart"]')!;
    fireEvent.pointerMove(within(screen.getByTestId("gantt")).getByText("Pentest Portal"), {
      clientX: 100,
      clientY: 100,
    });
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Pentest Portal");
    expect(tooltip).toHaveTextContent("Klien 1");
    expect(tooltip).toHaveTextContent("1 Feb 2026");
    expect(tooltip).toHaveTextContent("15 Mar 2026");
    expect(tooltip).toHaveTextContent("Assessment");
    expect(tooltip).toHaveTextContent("Andi");
    fireEvent.pointerLeave(chart);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("klik batang proyek membuka halaman detail", () => {
    renderTimeline();
    fireEvent.click(within(screen.getByTestId("gantt")).getByText("Pentest Portal"));
    expect(screen.getByText("Detail proyek")).toBeInTheDocument();
  });

  it("tombol Hari ini memindahkan rentang bila hari ini di luar rentang", () => {
    const schedule = {
      granularity: "month" as const,
      range: { start: new Date(2024, 0, 1), end: new Date(2024, 11, 31) },
    };
    const { onScheduleChange } = renderTimeline({ schedule });
    fireEvent.click(screen.getByRole("button", { name: "Hari ini" }));
    expect(onScheduleChange).toHaveBeenCalledWith({
      granularity: "month",
      range: { start: new Date(2026, 0, 1), end: new Date(2026, 11, 31) },
    });
  });

  it("keadaan loading, kosong, dan error dengan coba lagi", () => {
    const onRetry = vi.fn();
    const { unmount } = render(
      <MemoryRouter>
        <ProjectTimeline
          projects={[]}
          schedule={getDefaultScheduleRangeValue()}
          onScheduleChange={() => {}}
          isLoading
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Memuat timeline proyek")).toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter>
        <ProjectTimeline
          projects={[]}
          schedule={getDefaultScheduleRangeValue()}
          onScheduleChange={() => {}}
          error={new Error("Jaringan terputus")}
          onRetry={onRetry}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Jaringan terputus")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("menampilkan keadaan kosong bila tidak ada proyek pada rentang", () => {
    renderTimeline({ projects: [projects[2]!] });
    expect(screen.getByText("Tidak ada proyek terjadwal pada rentang ini")).toBeInTheDocument();
    expect(screen.queryByTestId("gantt")).toBeNull();
  });

  it("chart memiliki tinggi default setinggi layar (calc) dan minHeight", () => {
    renderTimeline();
    const chart = document.querySelector('[data-slot="project-timeline-chart"]') as HTMLElement;
    expect(chart).toBeInTheDocument();
    expect(chart.style.height).toBe("calc(100vh - 380px)");
    expect(chart.style.minHeight).toBe("560px");
  });

  it("default pagination menampilkan 10 proyek per halaman saat data banyak", () => {
    const manyProjects = Array.from({ length: 15 }, (_, i) =>
      make(i + 10, `Proyek ${i + 1}`, "2026-02-01", "2026-03-01", "Assessment", "Andi"),
    );
    renderTimeline({ projects: manyProjects });
    expect(screen.getByRole("combobox", { name: "Jumlah baris per halaman" })).toHaveTextContent(
      "10",
    );
    expect(bars()).toHaveLength(10);
  });
});
