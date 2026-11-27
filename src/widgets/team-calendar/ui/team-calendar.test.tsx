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
};

const gantt = vi.hoisted(() => ({ props: null as unknown }));

// SVAR menggambar ke kanvas berukuran nyata; di jsdom cukup render sel dan batang tiap task.
vi.mock("@svar-ui/react-gantt", () => ({
  Gantt: (props: GanttProps) => {
    gantt.props = props;
    const Bar = props.taskTemplate;
    return (
      <div data-testid="calendar-gantt" className="wx-chart">
        {props.tasks.map((t) => (
          <div key={t.id} data-row-id={t.id}>
            {props.columns.map((c) => (c.cell ? <c.cell key={c.id} row={t} /> : null))}
            <div className="wx-bar">
              <Bar data={t} />
            </div>
          </div>
        ))}
      </div>
    );
  },
  Willow: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
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
          mandays_id: 2, project_id: 4, project_name: "VAPT Billing", asset_name: "API",
          start_date: "2026-12-08", end_date: "2026-12-11",
        }),
      ],
    },
    {
      sys_user_id: 6, name: "Citra", workdays: 22,
      bookings: [
        booking({
          mandays_id: 3, masked: true, project_id: 0, project_name: "", project_code: "", asset_name: "",
          start_date: "2026-12-14", end_date: "2026-12-15", allocated_mandays: 2, warnings: [],
        }),
      ],
    },
  ],
};

const schedule: ScheduleRangeValue = {
  granularity: "day",
  range: { start: new Date(2026, 11, 1), end: new Date(2026, 11, 31) },
};

function ProjectStub() {
  return <p>Detail proyek {useParams().projectId}</p>;
}

const onScheduleChange = vi.fn();

function mount(calendar: CalendarData | undefined = data) {
  return render(
    <MemoryRouter initialEntries={["/calendar"]}>
      <Routes>
        <Route
          path="/calendar"
          element={<TeamCalendar data={calendar} isLoading={false} schedule={schedule} onScheduleChange={onScheduleChange} />}
        />
        <Route path="/projects/:projectId" element={<ProjectStub />} />
      </Routes>
    </MemoryRouter>,
  );
}

const row = (id: string) => document.querySelector<HTMLElement>(`[data-row-id="${id}"]`)!;
const segments = (id: string) => [...row(id).querySelectorAll<HTMLElement>('[data-slot="calendar-segment"]')];
/** Meniru perangkat: lebar/sempit dan punya hover atau tidak. */
const device = (wide: boolean, hover: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("min-width") ? wide : query.includes("hover") ? hover : false,
    addEventListener() {},
    removeEventListener() {},
  }));

describe("TeamCalendar (Gantt per proyek)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 11, 2, 9)); // Rabu, 2 Des 2026
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("menampilkan satu baris per proyek tanpa nama pentester", () => {
    mount();
    expect((gantt.props as GanttProps).tasks.map((t) => t.id)).toEqual(["project:3", "project:4", "project:masked"]);
    expect(within(row("project:3")).getByText("VAPT HRIS")).toBeInTheDocument();
    expect(within(row("project:masked")).getByText("Proyek lain")).toBeInTheDocument();
    expect(screen.queryByText(/Budi Santoso|Citra/)).not.toBeInTheDocument();
  });

  it("memutus batang di hari nonkerja dan menandai hari yang bentrok", () => {
    mount();
    expect(segments("project:3").map((s) => [s.dataset.start, s.dataset.end, s.dataset.conflict ?? ""])).toEqual([
      ["2026-12-04", "2026-12-04", ""],
      ["2026-12-07", "2026-12-07", ""],
      ["2026-12-08", "2026-12-08", "true"],
      ["2026-12-10", "2026-12-10", "true"],
    ]);
    expect(within(row("project:3")).getByLabelText("Ada peringatan bentrok")).toBeInTheDocument();
    expect(within(row("project:masked")).queryByLabelText("Ada peringatan bentrok")).not.toBeInTheDocument();
  });

  it("baru menampilkan pentester saat batang disorot", () => {
    mount();
    fireEvent.pointerMove(segments("project:4")[0]!);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("VAPT Billing");
    expect(tooltip).toHaveTextContent("Budi Santoso · API");
    expect(tooltip).toHaveTextContent("8 Des 2026 – 11 Des 2026 · 4 MD");
    expect(tooltip).toHaveTextContent("Bentrok dengan VAPT HRIS");
    fireEvent.pointerMove(row("project:4"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("klik batang membuka proyeknya", () => {
    mount();
    fireEvent.click(segments("project:3")[0]!);
    expect(screen.getByText("Detail proyek 3")).toBeInTheDocument();
  });

  it("proyek yang disamarkan tidak bisa dibuka", () => {
    mount();
    fireEvent.click(segments("project:masked")[0]!);
    expect(screen.queryByText(/Detail proyek/)).not.toBeInTheDocument();
  });

  it("di layar sentuh, ketuk batang menampilkan pentester dulu lalu tautan ke proyek", () => {
    device(true, false);
    mount();
    fireEvent.click(segments("project:3")[0]!);
    expect(screen.queryByText(/Detail proyek/)).not.toBeInTheDocument();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Budi Santoso · Portal");
    fireEvent.click(within(screen.getByRole("tooltip")).getByRole("button", { name: "Tutup" }));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    fireEvent.click(segments("project:3")[0]!);
    fireEvent.click(screen.getByRole("link", { name: "Buka proyek" }));
    expect(screen.getByText("Detail proyek 3")).toBeInTheDocument();
  });

  it("di layar sentuh, proyek yang disamarkan tidak punya tautan", () => {
    device(true, false);
    mount();
    fireEvent.click(segments("project:masked")[0]!);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Citra");
    expect(screen.queryByRole("link", { name: "Buka proyek" })).not.toBeInTheDocument();
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

  it("di layar lebar nama proyek ada di kolom, bukan di chart", () => {
    mount();
    expect((gantt.props as GanttProps).displayMode).toBe("all");
    expect(within(row("project:3").querySelector<HTMLElement>(".wx-bar")!).queryByText("VAPT HRIS")).not.toBeInTheDocument();
  });

  it("di layar sempit hanya chart yang tampil, dengan nama proyek di barisnya yang ikut bergeser", () => {
    device(false, false);
    mount();
    expect((gantt.props as GanttProps).displayMode).toBe("chart");
    const name = within(row("project:3").querySelector<HTMLElement>(".wx-bar")!).getByText("VAPT HRIS");
    fireEvent.scroll(screen.getByTestId("calendar-gantt"), { target: { scrollLeft: 120 } });
    expect(screen.getByRole("region", { name: "Jadwal tim" }).style.getPropertyValue("--calendar-scroll")).toBe("120px");
    expect(name.style.transform).toBe("translateX(var(--calendar-scroll, 0px))");
  });

  it("memberi tahu bila tidak ada jadwal yang cocok", () => {
    mount({ ...data, people: [] });
    expect(screen.getByText("Tidak ada jadwal yang cocok")).toBeInTheDocument();
    expect(screen.queryByTestId("calendar-gantt")).not.toBeInTheDocument();
  });
});
