import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { DraftAsset } from "../model/asset-plan";
import { AssetDialog } from "./asset-dialog";

beforeAll(() => {
  if (!("ResizeObserver" in globalThis)) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

const api = vi.hoisted(() => ({ checkSchedule: vi.fn() }));
vi.mock("@/entities/calendar", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/calendar")>()),
  checkSchedule: api.checkSchedule,
}));

const draft: DraftAsset = {
  key: "a1",
  id: 3,
  name: "Portal",
  type: "web",
  domain: "portal.test",
  ip: "",
  mandays: "4",
  pentesters: [{ key: "p1", mandaysId: 11, pentesterId: 5, start: "2026-12-01", end: "2026-12-31", md: "" }],
};

function renderDialog(onApply = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AssetDialog
        initial={draft}
        isNew={false}
        canAssign
        projectId={9}
        people={[{ sys_user_id: 5, name: "Budi" }]}
        defaultRange={{ start: "2026-12-01", end: "2026-12-31" }}
        check={() => []}
        onApply={onApply}
        onClose={() => {}}
      />
    </QueryClientProvider>,
  );
  return onApply;
}

describe("AssetDialog: jadwal dan peringatan pentester", () => {
  beforeEach(() => {
    api.checkSchedule.mockReset();
    api.checkSchedule.mockResolvedValue({
      workdays: 3,
      warnings: [
        { code: "other_project", dates: ["2026-12-03"], project_name: "" },
        { code: "exceeds_workdays", message: "4 MD melebihi 3 hari kerja efektif" },
      ],
    });
  });

  it("tanggal per pentester bisa diubah di dalam rentang proyek", async () => {
    const onApply = renderDialog();
    const start = screen.getByLabelText("Mulai pentester 1");
    expect(start).toHaveValue("2026-12-01");
    expect(start).toHaveAttribute("min", "2026-12-01");
    expect(screen.getByLabelText("Selesai pentester 1")).toHaveAttribute("max", "2026-12-31");
    await userEvent.clear(screen.getByLabelText("Selesai pentester 1"));
    await userEvent.type(screen.getByLabelText("Selesai pentester 1"), "2026-12-04");
    await userEvent.click(screen.getByRole("button", { name: "Terapkan perubahan" }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ pentesters: [expect.objectContaining({ start: "2026-12-01", end: "2026-12-04" })] }),
    );
  });

  it("menampilkan peringatan bentrok dari BE tanpa memblokir simpan", async () => {
    const onApply = renderDialog();
    const warnings = await screen.findByRole("list", { name: "Peringatan jadwal pentester 1" });
    expect(within(warnings).getByText("Bentrok dengan proyek lain pada 3 Des 2026")).toBeInTheDocument();
    expect(within(warnings).getByText("4 MD melebihi 3 hari kerja efektif")).toBeInTheDocument();
    expect(api.checkSchedule).toHaveBeenCalledWith({
      pentester_id: 5, from: "2026-12-01", to: "2026-12-31", allocated_mandays: 4, project_id: 9, exclude_mandays_id: 11,
    });
    await userEvent.click(screen.getByRole("button", { name: "Terapkan perubahan" }));
    await waitFor(() => expect(onApply).toHaveBeenCalled());
  });
});
