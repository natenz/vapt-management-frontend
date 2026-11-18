import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RoleBadge } from "./role-badge";

describe("RoleBadge", () => {
  it("merender chip Pentester dengan ikon Bug di dalam chip dan nama di luar chip seperti status proyek", () => {
    const { container } = render(<RoleBadge role="pentester" />);
    const label = screen.getByText("Pentester");
    expect(label).toBeInTheDocument();
    expect(label).toHaveClass("text-body-sm", "text-ink");
    const chip = container.querySelector("[data-slot='role-chip']");
    expect(chip).toHaveClass("bg-purple-50", "text-purple-700", "rounded-sm", "border-0", "size-6");
  });

  it("merender chip Tech Writer untuk technical_writer dengan palet sky", () => {
    const { container } = render(<RoleBadge role="technical_writer" />);
    expect(screen.getByText("Tech Writer")).toBeInTheDocument();
    const chip = container.querySelector("[data-slot='role-chip']");
    expect(chip).toHaveClass("bg-sky-50", "text-sky-700");
  });

  it("merender chip Project Manager untuk role project_manager dengan palet amber", () => {
    const { container } = render(<RoleBadge role="project_manager" />);
    expect(screen.getByText("Project Manager")).toBeInTheDocument();
    const chip = container.querySelector("[data-slot='role-chip']");
    expect(chip).toHaveClass("bg-amber-50", "text-amber-700");
  });

  it("menormalisasi variasi penulisan seperti huruf besar atau spasi", () => {
    render(<RoleBadge role="Project Manager" />);
    expect(screen.getByText("Project Manager")).toBeInTheDocument();
  });

  it("memberikan fallback aman untuk role tidak dikenal", () => {
    const { container } = render(<RoleBadge role="guest" />);
    expect(screen.getByText("guest")).toBeInTheDocument();
    const chip = container.querySelector("[data-slot='role-chip']");
    expect(chip).toHaveClass("bg-surface-subtle");
  });
});
