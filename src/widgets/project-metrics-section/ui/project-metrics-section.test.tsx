import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "@/entities/project";
import { ProjectMetricsSection } from "./project-metrics-section";

const mockProjects: Project[] = [
  {
    project_id: 1,
    project_name: "Proyek Assessment",
    client_name: "Klien 1",
    total_mandays: 10,
    projected_mandays: 10,
    pm_id: 1,
    start_date: "2026-11-01",
    end_date: "2026-11-30",
    status: { status_process_id: 4, status_name: "Assessment" },
  },
  {
    project_id: 2,
    project_name: "Proyek Done",
    client_name: "Klien 2",
    total_mandays: 5,
    projected_mandays: 5,
    pm_id: 1,
    start_date: "2026-11-01",
    end_date: "2026-11-10",
    status: { status_process_id: 11, status_name: "Done" },
  },
  {
    project_id: 3,
    project_name: "Proyek Draft",
    client_name: "Klien 3",
    total_mandays: 5,
    projected_mandays: 5,
    pm_id: 1,
    start_date: "2026-11-01",
    end_date: "2026-11-10",
    status: { status_process_id: 1, status_name: "Draft" },
  },
];

// Radix Select membutuhkan API pointer capture & scroll yang tidak ada di jsdom
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const intervalTrigger = () => screen.getByRole("combobox", { name: "Interval snapshot" });
const rangeTrigger = () => screen.getByRole("button", { name: /^Rentang data:/ });
const prev = () => screen.getByRole("button", { name: "Rentang sebelumnya" });
const next = () => screen.getByRole("button", { name: "Rentang berikutnya" });

const chooseInterval = async (label: string) => {
  fireEvent.keyDown(intervalTrigger(), { key: "Enter" });
  fireEvent.click(await screen.findByRole("option", { name: label }));
};

const chartPoints = (container: HTMLElement) =>
  container.querySelectorAll('[data-slot="project-schedule-chart"] circle[r="14"]').length;

describe("ProjectMetricsSection - Interval Snapshot & Rentang Data", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 17, 10, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("default: interval Bulan dengan rentang tahun berjalan (12 snapshot)", () => {
    const { container } = render(<ProjectMetricsSection projects={mockProjects} />);

    expect(intervalTrigger()).toHaveTextContent("Bulan");
    expect(rangeTrigger()).toHaveTextContent("1 Jan – 31 Des 2026");
    // Ikhtisar dan grafik berada dalam satu card; Draft dikecualikan dari total
    const summary = container.querySelector('[data-slot="project-schedule-summary"]');
    expect(summary).toHaveTextContent("Overview Jadwal Proyek");
    expect(summary).toHaveTextContent("2Total Terjadwal (1 Jan – 31 Des 2026)");
    expect(summary?.parentElement).toContainElement(
      container.querySelector('[data-slot="project-schedule-chart"]') as HTMLElement,
    );
    expect(chartPoints(container)).toBe(12);
  });

  it("pengalih Overview/Timeline: tanpa renderTimeline menampilkan panel kosong", () => {
    const { container } = render(<ProjectMetricsSection projects={mockProjects} />);

    const overviewTab = screen.getByRole("tab", { name: "Overview" });
    const timelineTab = screen.getByRole("tab", { name: "Timeline" });
    expect(overviewTab).toHaveAttribute("aria-selected", "true");

    fireEvent.mouseDown(timelineTab, { button: 0 });
    expect(timelineTab).toHaveAttribute("aria-selected", "true");
    const panel = container.querySelector('[data-slot="project-timeline-panel"]');
    expect(panel).toBeEmptyDOMElement();
    expect(container.querySelector('[data-slot="project-schedule-chart"]')).toBeNull();

    fireEvent.mouseDown(overviewTab, { button: 0 });
    expect(container.querySelector('[data-slot="project-schedule-chart"]')).toBeInTheDocument();
  });

  it("Timeline menerima interval & rentang yang sama dengan Overview", () => {
    render(
      <ProjectMetricsSection
        projects={mockProjects}
        renderTimeline={({ schedule }) => (
          <p data-testid="timeline-ctx">
            {schedule.granularity}|{schedule.range.start.getFullYear()}
          </p>
        )}
      />,
    );

    fireEvent.click(prev()); // Rentang mundur ke 2025
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Timeline" }), { button: 0 });

    expect(screen.getByTestId("timeline-ctx")).toHaveTextContent("month|2025");
    // Kontrol rentang tetap tersedia di Timeline
    expect(rangeTrigger()).toHaveTextContent("1 Jan – 31 Des 2025");
  });

  it("dropdown interval mengubah jumlah snapshot tanpa mengubah rentang", async () => {
    const { container } = render(<ProjectMetricsSection projects={mockProjects} />);

    await chooseInterval("Minggu");
    expect(intervalTrigger()).toHaveTextContent("Minggu");
    expect(rangeTrigger()).toHaveTextContent("1 Jan – 31 Des 2026");
    expect(chartPoints(container)).toBe(53);

    await chooseInterval("Tahun");
    expect(chartPoints(container)).toBe(1);

    await chooseInterval("Hari");
    expect(chartPoints(container)).toBe(365);
  });

  it("tombol sebelumnya/berikutnya menggeser rentang dengan panjang yang sama", () => {
    render(<ProjectMetricsSection projects={mockProjects} />);

    fireEvent.click(prev());
    expect(rangeTrigger()).toHaveTextContent("1 Jan – 31 Des 2025");
    fireEvent.click(next());
    fireEvent.click(next());
    expect(rangeTrigger()).toHaveTextContent("1 Jan – 31 Des 2027");
  });

  it("date picker: preset dan pemilihan rentang di kalender", async () => {
    const { container } = render(<ProjectMetricsSection projects={mockProjects} />);

    // Preset
    fireEvent.click(rangeTrigger());
    fireEvent.click(await screen.findByRole("button", { name: "3 bulan terakhir" }));
    expect(rangeTrigger()).toHaveTextContent("1 Sep – 30 Nov 2026");
    expect(chartPoints(container)).toBe(3);

    // Kalender: klik tanggal awal lalu tanggal akhir
    fireEvent.click(rangeTrigger());
    fireEvent.click(await screen.findByRole("button", { name: "3 November 2026" }));
    expect(screen.getByText(/pilih tanggal akhir/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "16 November 2026" }));
    expect(rangeTrigger()).toHaveTextContent("3 Nov – 16 Nov 2026");
  });

  it("interval otomatis naik bila rentang terlalu panjang untuk interval Hari", async () => {
    render(<ProjectMetricsSection projects={mockProjects} />);

    await chooseInterval("Hari");
    // Tunggu Select selesai mengembalikan fokus ke trigger-nya
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    fireEvent.click(rangeTrigger());
    // Navigasi ke Januari 2024 lewat tombol tahun & bulan
    fireEvent.click(await screen.findByRole("button", { name: "Tahun sebelumnya" }));
    fireEvent.click(screen.getByRole("button", { name: "Tahun sebelumnya" }));
    // Kalender terbuka di Desember 2026 (bulan tanggal akhir rentang aktif)
    for (let i = 0; i < 11; i++) {
      fireEvent.click(screen.getByRole("button", { name: "Bulan sebelumnya" }));
    }
    fireEvent.click(screen.getByRole("button", { name: "1 Januari 2024" }));
    // Tanggal akhir: kembali ke Desember 2026
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByRole("button", { name: "Tahun berikutnya" }));
    }
    for (let i = 0; i < 11; i++) {
      fireEvent.click(screen.getByRole("button", { name: "Bulan berikutnya" }));
    }
    fireEvent.click(screen.getByRole("button", { name: "31 Desember 2026" }));

    expect(rangeTrigger()).toHaveTextContent("1 Jan 2024 – 31 Des 2026");
    expect(intervalTrigger()).toHaveTextContent("Minggu");
  });

  it("tooltip muncul di titik terdekat kursor dan menyembunyi saat kursor keluar", () => {
    const { container } = render(<ProjectMetricsSection projects={mockProjects} />);

    const chartArea = container.querySelector('[data-slot="project-schedule-chart"]')
      ?.parentElement as HTMLElement;
    // jsdom tidak memiliki layout, jadi lebar area grafik disimulasikan 1000px
    chartArea.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 1000, height: 210, right: 1000, bottom: 210, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

    // Interval Bulan: 12 titik, titik November (indeks 10) berada di x ≈ 44 + (10/11) * 932
    fireEvent.pointerMove(chartArea, { clientX: 891, clientY: 100 });

    const tooltip = container.querySelector('[data-slot="project-schedule-tooltip"]');
    expect(tooltip).toHaveAttribute("data-state", "open");
    expect(tooltip).toHaveTextContent("November 2026");
    expect(tooltip).toHaveTextContent("2proyek terjadwal");
    expect(tooltip).toHaveTextContent("Proyek Assessment");
    expect(tooltip).not.toHaveTextContent("Proyek Draft");

    // Titik Januari tanpa proyek menampilkan keadaan kosong
    fireEvent.pointerMove(chartArea, { clientX: 44, clientY: 100 });
    expect(tooltip).toHaveTextContent("Tidak ada proyek pada periode ini");

    fireEvent.pointerLeave(chartArea);
    expect(tooltip).toHaveAttribute("data-state", "closed");
  });

  it("grafik memenuhi lebar card meskipun baru dirender setelah loading selesai", () => {
    const widthSpy = vi
      .spyOn(HTMLElement.prototype, "clientWidth", "get")
      .mockReturnValue(1240);

    const { container, rerender } = render(
      <ProjectMetricsSection projects={mockProjects} isLoading={true} />,
    );
    rerender(<ProjectMetricsSection projects={mockProjects} isLoading={false} />);

    expect(
      container.querySelector('[data-slot="project-schedule-chart"]'),
    ).toHaveAttribute("viewBox", "0 0 1240 210");
    widthSpy.mockRestore();
  });

  it("menampilkan kerangka loading saat isLoading bernilai true", () => {
    const { container } = render(
      <ProjectMetricsSection projects={mockProjects} isLoading={true} />,
    );

    expect(
      container.querySelector('[data-slot="project-schedule-chart"]'),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Overview Jadwal Proyek")).toBeInTheDocument();
  });
});
