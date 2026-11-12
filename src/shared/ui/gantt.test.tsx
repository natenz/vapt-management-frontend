/**
 * Menguji linimasa Gantt.
 *
 * Tiga hal yang dijaga:
 *
 *  1. Nama tahap tetap berada di kolom tetap dan kalender lintas bulan hanya
 *     memuat satu garis rentang tanpa titik endpoint.
 *  2. Tahap selesai memakai merah, sedangkan tahap yang belum selesai memakai
 *     abu-abu gelap; pinpoint progres membuka viewport langsung di tahap aktif.
 *  3. Bagian 11 dokumen konteks: "Clicking a timeline event should open a
 *     detail popover." Isi popover itulah satu-satunya tempat catatan tim VAPT
 *     terbaca klien, jadi kalau ia berhenti terbuka, fiturnya hilang tanpa
 *     suara — build dan typecheck tidak akan mengeluh.
 */
import { describe, expect, it, beforeAll, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShieldCheck } from "lucide-react";
import { Gantt, type GanttItem } from "@/shared/ui/gantt";

beforeAll(() => {
  // Radix memakai pointer capture, yang tidak ada di jsdom.
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

const ITEMS: GanttItem[] = [
  {
    id: "step-1",
    label: "Langkah 1",
    startsAt: "2026-09-03T00:00:00Z",
    endsAt: "2026-09-07T00:00:00Z",
    state: "done",
    icon: <ShieldCheck />,
    iconClassName: "bg-activity-assessment text-on-brand",
  },
  {
    id: "step-2",
    label: "Langkah 2",
    startsAt: "2026-09-08T00:00:00Z",
    endsAt: "2026-09-12T00:00:00Z",
    state: "current",
  },
  {
    id: "step-3",
    label: "Langkah 3",
    startsAt: "2026-09-13T00:00:00Z",
    endsAt: "2026-09-18T00:00:00Z",
    state: "todo",
  },
];

const MONTH = new Date(2026, 8, 1);

function renderGantt() {
  return render(
    <Gantt
      items={ITEMS}
      initialMonth={MONTH}
      renderDetail={(item) => <p>Catatan untuk {item.label}</p>}
    />,
  );
}

describe("Gantt", () => {
  it("merender satu batang per langkah pada satu kanvas timeline", () => {
    renderGantt();
    for (const item of ITEMS) {
      expect(screen.getByRole("button", { name: item.label }), item.label).toBeInTheDocument();
    }
  });

  it("menyimpan keadaan pada setiap rentang kalender", () => {
    renderGantt();

    const done = screen.getByRole("button", { name: "Langkah 1" });
    const current = screen.getByRole("button", { name: "Langkah 2" });
    const todo = screen.getByRole("button", { name: "Langkah 3" });

    expect(done).toHaveAttribute("data-state", "done");
    expect(current).toHaveAttribute("data-state", "current");
    expect(todo).toHaveAttribute("data-state", "todo");
  });

  it("menampilkan satu garis rentang tanpa titik endpoint", () => {
    const { container } = renderGantt();

    expect(container.querySelectorAll('[data-slot="gantt-range"]')).toHaveLength(ITEMS.length);
    for (const item of ITEMS) {
      const button = screen.getByRole("button", { name: item.label });
      expect(button.children).toHaveLength(1);
      expect(button.querySelector('[data-slot="gantt-range"]')).toHaveClass("h-10");
    }
  });

  it("membedakan tahap selesai dan belum selesai melalui warna status", () => {
    renderGantt();

    expect(
      screen.getByRole("button", { name: "Langkah 1" }).querySelector('[data-slot="gantt-range"]'),
    ).toHaveClass("bg-surface-brand");
    expect(
      screen.getByRole("button", { name: "Langkah 2" }).querySelector('[data-slot="gantt-range"]'),
    ).toHaveClass("bg-surface-inverse");
    expect(
      screen.getByRole("button", { name: "Langkah 3" }).querySelector('[data-slot="gantt-range"]'),
    ).toHaveClass("bg-surface-inverse");
    expect(screen.getByLabelText("Legenda status kalender")).toHaveTextContent(
      "SelesaiBelum selesai",
    );
  });

  it("mempertahankan warna khas tahap pada ikon di kolom kiri", () => {
    const { container } = renderGantt();

    expect(container.querySelector('[data-slot="gantt-stage-icon"]')).toHaveClass(
      "bg-activity-assessment",
      "text-on-brand",
    );
    expect(container.querySelector('[data-slot="gantt-stage-icon"]')).not.toHaveClass(
      "bg-surface-brand",
      "bg-surface-inverse",
    );
  });

  it("menandai posisi progres pada tahap aktif", () => {
    const { container } = renderGantt();
    const pin = container.querySelector<HTMLElement>('[data-slot="gantt-progress-pin"]');

    expect(pin).toHaveAttribute("title", "Posisi progres saat ini");
    expect(pin).toHaveStyle({ left: "90%" });
    expect(screen.getByRole("button", { name: "Langkah 2" })).toContainElement(pin);
  });

  it("memusatkan viewport ke pinpoint saat pertama kali dirender", () => {
    const clientWidth = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(440);
    const scrollWidth = vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(1320);

    const { container } = renderGantt();
    const viewport = container.querySelector<HTMLElement>('[data-slot="gantt-viewport"]');

    expect(viewport?.scrollLeft).toBe(286);
    clientWidth.mockRestore();
    scrollWidth.mockRestore();
  });

  it("menempatkan batang pada kolom tanggalnya", () => {
    const { container } = renderGantt();

    // 3 sampai 7 September menempati kolom 3 sampai 7; batas akhir grid eksklusif.
    const cell = container.querySelector('[style*="grid-column: 3 / 8"]');
    expect(cell, "Langkah 1 harus mulai di kolom 3 dan berakhir di kolom 8").not.toBeNull();
    expect(cell).not.toHaveTextContent("Langkah 1");
    expect(container.querySelector('[data-slot="gantt-labels"]')).toHaveTextContent("Langkah 1");
  });

  it("menampilkan batang lintas bulan tanpa memotong atau mengganti halaman", () => {
    const { container } = render(
      <Gantt
        items={[
          {
            id: "lintas",
            label: "Lintas bulan",
            startsAt: "2026-08-28T00:00:00Z",
            endsAt: "2026-09-04T00:00:00Z",
            state: "done",
          },
        ]}
        initialMonth={MONTH}
        renderDetail={() => null}
      />,
    );

    expect(screen.getByText("Agustus 2026")).toBeInTheDocument();
    expect(screen.getByText("September 2026")).toBeInTheDocument();
    const cell = container.querySelector('[style*="grid-column: 28 / 36"]');
    expect(cell, "batang harus menyambung dari Agustus sampai September").not.toBeNull();
  });

  it("membuka popover berisi catatan saat batang diklik", async () => {
    const user = userEvent.setup();
    renderGantt();

    expect(screen.queryByText("Catatan untuk Langkah 1")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Langkah 1" }));

    expect(screen.getByText("Catatan untuk Langkah 1")).toBeInTheDocument();
  });

  it("menyediakan viewport horizontal yang dapat difokuskan", () => {
    const { container } = renderGantt();
    const viewport = screen.getByRole("region", { name: "Timeline proyek lintas bulan" });

    expect(viewport).toHaveAttribute("tabindex", "0");
    expect(viewport).toHaveClass("overflow-x-auto", "overscroll-x-contain");
    expect(container.querySelector('[data-slot="gantt-canvas"]')).toHaveStyle({
      minWidth: `${30 * 44}px`,
    });
  });

  it("memindahkan seluruh rentang tahap dengan drag pada badan bar", () => {
    const onItemChange = vi.fn();
    render(
      <Gantt
        items={ITEMS}
        editable
        rangeStart="2026-09-01"
        rangeEnd="2026-09-30"
        onItemChange={onItemChange}
      />,
    );

    const bar = screen.getByRole("button", { name: "Langkah 2" });
    fireEvent.pointerDown(bar, { pointerId: 1, clientX: 100 });
    fireEvent.pointerMove(bar, { pointerId: 1, clientX: 188 });
    fireEvent.pointerUp(bar, { pointerId: 1, clientX: 188 });

    expect(onItemChange).toHaveBeenLastCalledWith("step-2", "2026-09-10", "2026-09-14");
  });

  it("mengubah ujung rentang per hari melalui handle keyboard", () => {
    const onItemChange = vi.fn();
    render(
      <Gantt
        items={ITEMS}
        editable
        rangeStart="2026-09-01"
        rangeEnd="2026-09-30"
        onItemChange={onItemChange}
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: "Ubah tanggal mulai Langkah 2" }), {
      key: "ArrowLeft",
    });

    expect(onItemChange).toHaveBeenLastCalledWith("step-2", "2026-09-07", "2026-09-12");
  });

  it("menampilkan kolom No, Item, dan Owner serta menandai kolom akhir pekan saat owner diisi", () => {
    const { container } = render(
      <Gantt
        items={[
          { id: "s1", label: "Scoping", owner: "Telkom", startsAt: "2026-09-04", endsAt: "2026-09-04", state: "done" },
          { id: "s2", label: "Remediasi", owner: "Indopack", startsAt: "2026-09-07", endsAt: "2026-09-11", state: "current" },
        ]}
        initialMonth={MONTH}
      />,
    );

    const labels = container.querySelector('[data-slot="gantt-labels"]')!;
    expect(labels).toHaveTextContent("No");
    expect(labels).toHaveTextContent("Item");
    expect(labels).toHaveTextContent("Owner");
    expect(labels).toHaveTextContent("Telkom");
    expect(labels).toHaveTextContent("Indopack");
    expect(container.querySelectorAll(".bg-info-bg").length).toBeGreaterThan(0);
  });
});
