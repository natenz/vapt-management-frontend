import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PROJECT_STATUSES } from "@/shared/api/schemas";
import { ProjectStatusBadge } from "./project-status-badge";

describe("ProjectStatusBadge", () => {
  it("merender setiap status dengan ikon semantik dan teks", () => {
    for (const status of PROJECT_STATUSES) {
      const { container, unmount } = render(<ProjectStatusBadge name={status} />);
      const badge = container.querySelector('[data-slot="project-status-badge"]');

      expect(badge, `Status ${status} harus merender elemen badge`).not.toBeNull();
      expect(badge?.textContent?.trim()).toBe(status);
      expect(
        badge?.querySelector("svg"),
        `Status ${status} harus memiliki ikon SVG`,
      ).not.toBeNull();

      unmount();
    }
  });

  it("menerapkan spesifikasi desain: chip hanya berisi logo, status teks di luar chip, rounded-sm, border-0, dan font-normal", () => {
    const { container } = render(<ProjectStatusBadge name="Scoping" />);
    const badge = container.querySelector('[data-slot="project-status-badge"]');
    const chip = container.querySelector('[data-slot="project-status-chip"]');
    const label = screen.getByText("Scoping");

    expect(badge).not.toBeNull();
    expect(chip).not.toBeNull();
    expect(chip).toHaveClass("rounded-sm");
    expect(chip).toHaveClass("border-0");
    expect(chip).toHaveClass("bg-cyan-50");
    expect(chip).toHaveClass("text-cyan-700");
    // Tema gelap: latar tint transparan dan ikon terang
    expect(chip).toHaveClass("dark:bg-cyan-400/15");
    expect(chip).toHaveClass("dark:text-cyan-300");
    expect(chip?.querySelector("svg")).not.toBeNull();
    expect(chip?.textContent?.trim()).toBe(""); // Chip hanya berisi logo, teks tidak di dalam chip
    expect(label).toHaveClass("font-normal");
  });

  it("menangani nilai kosong atau null secara aman tanpa error", () => {
    render(<ProjectStatusBadge name={null} />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
