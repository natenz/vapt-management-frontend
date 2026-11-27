import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { MemoryRouter, Route, Routes, useParams } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarBooking, TeamCalendar as CalendarData } from "@/entities/calendar";
import type { ScheduleRangeValue } from "@/features/schedule-range";
import { TODAY_CELL_CLASS, WEEKEND_CELL_CLASS } from "@/shared/ui/svar-gantt";
import { TeamCalendar } from "./team-calendar";

type Row = { id: string };
type GanttProps = {
  displayMode: string;
  tasks: Row[];
  columns: { id: string; cell?: ComponentType<{ row: Row }> }[];
  taskTemplate: ComponentType<{ data: Row }>;
  highlightTime: (date: Date, unit: string) => string;
  init?: (api: { on: () => void; exec: () => void; getTask: (id: string) => Row | undefined }) => void;
};

const gantt = vi.hoisted(() => ({ props: null as unknown }));

// SVAR menggambar ke kanvas berukuran nyata; di jsdom cukup render sel dan batang tiap task.
vi.mock("@svar-ui/react-gantt", async () => {
  const { useEffect, useRef } = await import("react");
  return {
    Gantt: (props: GanttProps) => {
      gantt.props = props;
      const tasks = useRef(props.tasks);
      tasks.current = props.tasks;
      // Seperti SVAR asli, init dipanggil sekali.
      useEffect(() => {
        props.init?.({ on: () => {}, exec: () => {}, getTask: (id) => tasks.current.find((t) => t.id === id) });
      }, []);
      const Bar = props.taskTemplate;
      return (
        <div data-testid="calendar-gantt" className="wx-chart">
          {props.tasks.map((t) => (
            <div key={t.id} data-row={t.id}>
              {props.columns.map((c) => (c.cell ? <c.cell key={c.id} row={t} /> : null))}
              <div className="wx-bar" data-task-id={t.id}>
                <Bar data={t} />
              </div>
            </div>
          ))}
        </div>
      );
    },
    Willow: ({ children }: { children: ReactNode }) => <>{children}</>,
    locateTask: (event: Event) => {
      const id = (event.target as HTMLElement).closest("[data-task-id]")?.getAttribute("data-task-id");
      return id ? { id } : null;
    },
  };
});
vi.mock("@svar-ui/react-gantt/all.css", () => ({}));

const booking = (over: Partial<CalendarBooking> = {}): CalendarBooking => ({
  mandays_id: 1, project_id: 3, project_name: "VAPT HRIS", project_code: "PRJ-3", asset_name: "Portal",
  start_date: "2026-12-04", end_date: "2026-12-10", allocated_mandays: 4, masked: false, warnings: ["other_project"], ...over,
});

const data: CalendarData = {
  from: "2026-12-01",
  to: "2026-12-31",
  holidays: [{ holiday_id: 1, date: "2026-12-09", name: "Libur kantor" }],
  people: [
    {
      sys_user_id: 5, name: "Budi Santoso", workdays: 22,
      bookings: [
        booking(),
        booking({
          mandays_id: 2, masked: true, project_id: 0, project_name: "", project_code: "", asset_name: "",
          start_date: "2026-12-14", end_date: "2026-12-15", warnings: [],
        }),
      ],
    },
    { sys_user_id: 6, name: "Citra", workdays: 22, bookings: [] },
  ],
};

const schedule: ScheduleRangeValue = {
  granularity: "day",
  range: { start: new Date(2026, 11, 1), end: new Date(2026, 11, 31) },
};

function ProjectStub() {
  return <p>Detail proyek {useParams().projectId}</p>;
}

function mount(calendar: CalendarData | undefined = data, isLoading = false) {
  return render(
    <MemoryRouter initialEntries={["/calendar"]}>
      <Routes>
        <Route
          path="/calendar"
          element={<TeamCalendar data={calendar} isLoading={isLoading} schedule={schedule} onScheduleChange={onScheduleChange} />}
        />
        <Route path="/projects/:projectId" element={<ProjectStub />} />
      </Routes>
    </MemoryRouter>,
  );
}

const onScheduleChange = vi.fn();

const bar = (id: string) => document.querySelector<HTMLElement>(`[data-task-id="${id}"]`)!;
const row = (id: string) => document.querySelector<HTMLElement>(`[data-row="${id}"]`)!;

describe("TeamCalendar (Gantt)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 11, 2, 9)); // Rabu, 2 Des 2026
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("di layar lebar nama pentester ada di kolom, bukan di chart", () => {
    mount();
    expect((gantt.props as GanttProps).displayMode).toBe("all");
    expect(within(bar("user:5")).queryByText("Budi Santoso")).not.toBeInTheDocument();
  });

  it("di layar sempit hanya chart yang tampil, dengan nama pentester di barisnya", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    mount();
    expect((gantt.props as GanttProps).displayMode).toBe("chart");
    expect(within(bar("user:5")).getByText("Budi Santoso")).toBeInTheDocument();
    expect(within(bar("user:6")).getByText("Citra · Kosong")).toBeInTheDocument();
  });

  it("nama di layar sempit ikut bergeser saat chart digulir", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    mount();
    fireEvent.scroll(screen.getByTestId("calendar-gantt"), { target: { scrollLeft: 120 } });
    expect(screen.getByRole("region", { name: "Jadwal tim" }).style.getPropertyValue("--calendar-scroll")).toBe("120px");
    expect(within(bar("user:5")).getByText("Budi Santoso").style.transform).toBe("translateX(var(--calendar-scroll, 0px))");
  });

  it("menampilkan pentester, penugasan, penanda bentrok, dan yang masih kosong", () => {
    mount();
    expect(within(row("user:5")).getAllByText("Budi Santoso").length).toBeGreaterThan(0);
    expect(within(bar("booking:1")).getByText("VAPT HRIS · Portal")).toBeInTheDocument();
    expect(within(bar("booking:1")).getByLabelText("Ada peringatan bentrok")).toBeInTheDocument();
    expect(within(bar("booking:2")).getByText("Proyek lain")).toBeInTheDocument();
    expect(within(bar("booking:2")).queryByLabelText("Ada peringatan bentrok")).not.toBeInTheDocument();
    expect(within(row("user:6")).getByText("Kosong")).toBeInTheDocument();
  });

  it("memutus batang di akhir pekan dan hari libur", () => {
    mount();
    const segments = [...bar("booking:1").querySelectorAll('[data-slot="calendar-work-segment"]')].map((s) => [
      s.getAttribute("data-start"),
      s.getAttribute("data-end"),
    ]);
    expect(segments).toEqual([
      ["2026-12-04", "2026-12-04"],
      ["2026-12-07", "2026-12-08"],
      ["2026-12-10", "2026-12-10"],
    ]);
  });

  it("mengarsir akhir pekan dan hari libur, dan menandai hari ini, pada skala harian", () => {
    mount();
    const { highlightTime } = gantt.props as GanttProps;
    expect(highlightTime(new Date(2026, 11, 5), "day")).toBe(WEEKEND_CELL_CLASS);
    expect(highlightTime(new Date(2026, 11, 9), "day")).toBe(WEEKEND_CELL_CLASS);
    expect(highlightTime(new Date(2026, 11, 2), "day")).toBe(TODAY_CELL_CLASS);
    expect(highlightTime(new Date(2026, 11, 8), "day")).toBe("");
    expect(highlightTime(new Date(2026, 11, 1), "month")).toBe("");
  });

  it("menyebut nama hari libur yang diarsir", () => {
    mount();
    expect(screen.getByRole("list", { name: "Hari libur di rentang ini" })).toHaveTextContent("9 Des 2026 · Libur kantor");
  });

  it("menampilkan rincian dan peringatan saat batang disorot", () => {
    mount();
    fireEvent.pointerMove(within(bar("booking:1")).getByText("VAPT HRIS · Portal"));
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("4 Des 2026 – 10 Des 2026");
    expect(tooltip).toHaveTextContent("4 MD");
    expect(tooltip).toHaveTextContent("Bentrok: Proyek lain");
  });

  it("klik batang membuka proyeknya", () => {
    mount();
    fireEvent.click(within(bar("booking:1")).getByText("VAPT HRIS · Portal"));
    expect(screen.getByText("Detail proyek 3")).toBeInTheDocument();
  });

  it("proyek yang disamarkan tidak bisa dibuka", () => {
    mount();
    fireEvent.click(within(bar("booking:2")).getByText("Proyek lain"));
    expect(screen.queryByText(/Detail proyek/)).not.toBeInTheDocument();
  });

  it("memberi tahu bila tidak ada pentester yang cocok", () => {
    mount({ ...data, people: [] });
    expect(screen.getByText("Tidak ada jadwal yang cocok")).toBeInTheDocument();
    expect(screen.queryByTestId("calendar-gantt")).not.toBeInTheDocument();
  });
});
