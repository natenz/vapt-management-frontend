/**
 * Menguji Gantt tahap berbasis SVAR.
 *
 * Yang dijaga:
 *  1. Satu batang per tahap, keadaan Selesai/Belum selesai, dan pin progres.
 *  2. Perilaku edit lama tetap ada: drag (payload `update-task` SVAR) dan
 *     panah keyboard mengubah jadwal per hari dalam batas rentang proyek.
 *  3. Detail tahap terbaca saat batang diklik (pengganti popover lama).
 *
 * SVAR bergantung pada layout & ResizeObserver yang tidak ada di jsdom, jadi
 * digantikan stub yang merender kolom grid dan taskTemplate asli serta
 * merekam handler `intercept`/`on` agar alur drag bisa disimulasikan.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { ShieldCheck } from "lucide-react";
import { useEffect, type ComponentType, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Handler = (ev: Record<string, unknown>) => unknown;
const svar = vi.hoisted(() => ({
  intercepts: new Map<string, (ev: Record<string, unknown>) => unknown>(),
  listeners: new Map<string, (ev: Record<string, unknown>) => unknown>(),
  exec: (() => {}) as (action: string, ev: Record<string, unknown>) => void,
  props: {} as Record<string, unknown>,
}));

vi.mock("@svar-ui/react-gantt", () => ({
  Willow: ({ children }: { children: ReactNode }) => <div data-testid="willow">{children}</div>,
  locateTask: (ev: MouseEvent) => {
    const node = (ev.target as HTMLElement).closest("[data-id]");
    return node ? { id: node.getAttribute("data-id"), node } : null;
  },
  Gantt: (props: {
    tasks: { id: string }[];
    columns: { id: string; header: string; cell: ComponentType<{ row: unknown }> }[];
    taskTemplate: ComponentType<{ data: unknown }>;
    init?: (api: unknown) => void;
  }) => {
    svar.props = props;
    useEffect(() => {
      props.init?.({
        intercept: (action: string, fn: Handler) => svar.intercepts.set(action, fn),
        on: (action: string, fn: Handler) => svar.listeners.set(action, fn),
        exec: (action: string, ev: Record<string, unknown>) => svar.exec(action, ev),
        getTask: (id: string) => props.tasks.find((t) => t.id === id),
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const Bar = props.taskTemplate;
    return (
      <div data-testid="gantt">
        <div role="rowgroup" aria-label="grid">
          <div role="row">
            {props.columns.map((c) => (
              <span key={c.id} role="columnheader">
                {c.header}
              </span>
            ))}
          </div>
          {props.tasks.map((t) => (
            <div key={t.id} role="row">
              {props.columns.map((c) => (
                <span key={c.id} role="cell">
                  <c.cell row={t} />
                </span>
              ))}
            </div>
          ))}
        </div>
        {props.tasks.map((t) => (
          <div key={t.id} className="wx-bar" data-id={t.id}>
            <Bar data={t} />
          </div>
        ))}
      </div>
    );
  },
}));
vi.mock("@svar-ui/react-gantt/all.css", () => ({}));

const { Gantt, clampChange } = await import("@/shared/ui/gantt");
type GanttItem = import("@/shared/ui/gantt").GanttItem;

const ITEMS: GanttItem[] = [
  {
    id: "step-1",
    label: "Langkah 1",
    startsAt: "2026-09-03",
    endsAt: "2026-09-07",
    state: "done",
    icon: <ShieldCheck />,
    iconClassName: "bg-activity-assessment text-on-brand",
  },
  { id: "step-2", label: "Langkah 2", startsAt: "2026-09-08", endsAt: "2026-09-12", state: "current" },
  { id: "step-3", label: "Langkah 3", startsAt: "2026-09-13", endsAt: "2026-09-18", state: "todo" },
];

const execSpy = vi.fn();
beforeEach(() => {
  svar.intercepts.clear();
  svar.listeners.clear();
  execSpy.mockReset();
  svar.exec = execSpy;
  vi.useRealTimers();
});

const bar = (id: string) => document.querySelector(`.wx-bar[data-id="${id}"]`) as HTMLElement;

describe("Gantt (SVAR)", () => {
  it("merender warna per stage dan potongan yang melewati Sabtu–Minggu serta libur pilihan", () => {
    const items = [{ ...ITEMS[0]!, startsAt: "2026-09-04", endsAt: "2026-09-09", barClassName: "bg-cyan-600" }];
    const { rerender } = render(<Gantt items={items} skipWeekends holidays={["2026-09-08"]} />);
    const segments = bar("step-1").querySelectorAll('[data-slot="gantt-work-segment"]');
    expect(segments).toHaveLength(3);
    expect([...segments].map((s) => [s.getAttribute("data-start"), s.getAttribute("data-end")])).toEqual([
      ["2026-09-04", "2026-09-04"], ["2026-09-07", "2026-09-07"], ["2026-09-09", "2026-09-09"],
    ]);
    expect(segments[0]).toHaveClass("bg-cyan-600");
    rerender(<Gantt items={items} skipWeekends holidays={[]} />);
    expect(bar("step-1").querySelectorAll('[data-slot="gantt-work-segment"]')).toHaveLength(2);
  });
  it("merender satu batang per stage dengan keadaan Selesai/Belum selesai", () => {
    render(<Gantt items={ITEMS} />);
    expect(document.querySelectorAll(".wx-bar")).toHaveLength(3);
    expect(bar("step-1").querySelector("[data-state]")).toHaveAttribute("data-state", "done");
    // Batang tanpa teks: nama tahap hanya di grid kiri
    expect(bar("step-1").textContent).toBe("");
    expect(bar("step-1").querySelector('[data-slot="gantt-range"]')?.className).toContain(
      "bg-surface-brand",
    );
    expect(bar("step-3").querySelector('[data-slot="gantt-range"]')?.className).toContain(
      "bg-surface-inverse",
    );
    expect(screen.getByText("Selesai")).toBeInTheDocument();
    expect(screen.getByText("Belum selesai")).toBeInTheDocument();
  });

  it("menandai posisi progres hanya pada stage aktif", () => {
    render(<Gantt items={ITEMS} />);
    expect(bar("step-2").querySelector('[data-slot="gantt-progress-pin"]')).not.toBeNull();
    expect(bar("step-1").querySelector('[data-slot="gantt-progress-pin"]')).toBeNull();
  });

  it("menggulir chart ke pin progres saat inisialisasi", () => {
    vi.useFakeTimers();
    render(<Gantt items={ITEMS} />);
    vi.runAllTimers();
    expect(execSpy).toHaveBeenCalledWith("scroll-chart", expect.objectContaining({ date: expect.any(Date) }));
  });

  it("menampilkan ikon stage di grid dan kolom No/Item/Owner saat owner diisi", () => {
    const { unmount } = render(<Gantt items={ITEMS} />);
    expect(screen.getByRole("columnheader", { name: "Stage" })).toBeInTheDocument();
    expect(document.querySelector('[data-slot="gantt-stage-icon"]')?.className).toContain(
      "bg-activity-assessment",
    );
    unmount();

    render(<Gantt items={ITEMS.map((i) => ({ ...i, owner: "Telkom" }))} />);
    for (const name of ["No", "Item", "Owner"]) {
      expect(screen.getByRole("columnheader", { name })).toBeInTheDocument();
    }
    expect(screen.getAllByText("Telkom")).toHaveLength(3);
  });

  it("membuka detail stage saat batang diklik pada mode hanya-baca", () => {
    render(<Gantt items={ITEMS} renderDetail={(item) => <p>Catatan untuk {item.label}</p>} />);
    fireEvent.click(bar("step-2").querySelector('[data-slot="gantt-range"]')!);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Catatan untuk Langkah 2");
    fireEvent.keyDown(screen.getByRole("region", { name: "Timeline proyek lintas bulan" }), {
      key: "Escape",
    });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("menolak editor, tambah/hapus tugas, link, dan urut ulang baris", () => {
    render(<Gantt items={ITEMS} editable onItemChange={vi.fn()} />);
    for (const action of ["show-editor", "add-task", "delete-task", "add-link", "move-task"]) {
      expect(svar.intercepts.get(action)?.({})).toBe(false);
    }
  });

  it("drag badan batang memindahkan seluruh rentang dan dibatasi rentang proyek", () => {
    const onItemChange = vi.fn();
    render(
      <Gantt
        items={ITEMS}
        editable
        rangeStart="2026-09-01"
        rangeEnd="2026-09-20"
        onItemChange={onItemChange}
      />,
    );
    const update = svar.intercepts.get("update-task")!;
    // Payload SVAR saat drag dilepas: tanggal lama + selisih hari
    const ev = { id: "step-2", diff: 2, task: { start: new Date(), end: new Date() } };
    expect(update(ev)).toBe(true);
    expect(onItemChange).toHaveBeenCalledWith("step-2", "2026-09-10", "2026-09-14");

    update({ id: "step-3", diff: 10, task: { start: new Date(), end: new Date() } });
    expect(onItemChange).toHaveBeenLastCalledWith("step-3", "2026-09-15", "2026-09-20");
  });

  it("drag ujung batang hanya mengubah tanggal mulai atau selesai", () => {
    const onItemChange = vi.fn();
    render(<Gantt items={ITEMS} editable onItemChange={onItemChange} />);
    const update = svar.intercepts.get("update-task")!;
    update({ id: "step-1", diff: -2, task: { start: new Date() } });
    expect(onItemChange).toHaveBeenLastCalledWith("step-1", "2026-09-01", "2026-09-07");
    update({ id: "step-1", diff: 3, task: { end: new Date() } });
    expect(onItemChange).toHaveBeenLastCalledWith("step-1", "2026-09-03", "2026-09-10");
    // Pembaruan sementara selama drag tidak mengubah jadwal
    update({ id: "step-1", diff: 1, task: { end: new Date() }, inProgress: true });
    expect(onItemChange).toHaveBeenCalledTimes(2);
  });

  it("panah keyboard pada batang terpilih menggeser per hari (Shift: selesai, Alt: mulai)", () => {
    const onItemChange = vi.fn();
    render(<Gantt items={ITEMS} editable onItemChange={onItemChange} />);
    const region = screen.getByRole("region", { name: "Timeline proyek lintas bulan" });
    fireEvent.click(bar("step-2").querySelector('[data-slot="gantt-range"]')!);

    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(onItemChange).toHaveBeenLastCalledWith("step-2", "2026-09-09", "2026-09-13");
    fireEvent.keyDown(region, { key: "ArrowLeft", shiftKey: true });
    expect(onItemChange).toHaveBeenLastCalledWith("step-2", "2026-09-08", "2026-09-11");
    fireEvent.keyDown(region, { key: "ArrowLeft", altKey: true });
    expect(onItemChange).toHaveBeenLastCalledWith("step-2", "2026-09-07", "2026-09-12");
    expect(execSpy).toHaveBeenCalledWith(
      "update-task",
      expect.objectContaining({ id: "step-2", eventSource: "vapt-gantt" }),
    );
  });

  it("mengganti skala Hari/Minggu", () => {
    const onGranularityChange = vi.fn();
    render(<Gantt items={ITEMS} granularity="day" onGranularityChange={onGranularityChange} />);
    expect(screen.getByRole("radio", { name: "Hari" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "Minggu" }));
    expect(onGranularityChange).toHaveBeenCalledWith("week");
  });

  it("menampilkan pesan bila tidak ada rentang tanggal valid", () => {
    render(<Gantt items={[]} />);
    expect(screen.getByText("Timeline belum memiliki rentang tanggal yang valid.")).toBeInTheDocument();
  });
});

describe("clampChange", () => {
  const limit = { start: new Date(2026, 8, 1), end: new Date(2026, 8, 30) };
  const item = { startsAt: "2026-09-10", endsAt: "2026-09-15" };

  it("memindahkan dengan durasi tetap dan menahan di batas rentang", () => {
    expect(clampChange(item, "move", 3, limit)).toEqual({ startsAt: "2026-09-13", endsAt: "2026-09-18" });
    expect(clampChange(item, "move", -20, limit)).toEqual({ startsAt: "2026-09-01", endsAt: "2026-09-06" });
    expect(clampChange(item, "move", 30, limit)).toEqual({ startsAt: "2026-09-25", endsAt: "2026-09-30" });
  });

  it("mengubah ujung tanpa melewati ujung lainnya", () => {
    expect(clampChange(item, "start", 10, limit)).toEqual({ startsAt: "2026-09-15", endsAt: "2026-09-15" });
    expect(clampChange(item, "end", -10, limit)).toEqual({ startsAt: "2026-09-10", endsAt: "2026-09-10" });
    expect(clampChange(item, "end", 40, limit)).toEqual({ startsAt: "2026-09-10", endsAt: "2026-09-30" });
  });
});
