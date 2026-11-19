import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { ResourceProject } from "@/entities/project";
import type { User } from "@/entities/user";
import { ResourceProjectsCell } from "./resource-projects-cell";

const mockUser: User = {
  sys_user_id: 5,
  username: "pentester.budi",
  email: "budi@telkom.co.id",
  role_id: 3,
  role: { role_id: 3, role_name: "pentester" },
  profile: { user_id: 5, full_name: "Budi Santoso", department: "Offensive Security" },
};

describe("ResourceProjectsCell", () => {
  it("menampilkan strip '-' bila tidak ada proyek aktif", () => {
    render(
      <MemoryRouter>
        <ResourceProjectsCell user={mockUser} projects={[]} />
      </MemoryRouter>,
    );
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("menampilkan hingga 2 proyek secara langsung sebagai chip link", () => {
    const projects: ResourceProject[] = [
      { id: 10, name: "Portal Satu Data", status: "Assessment", mandays: 4 },
      { id: 11, name: "API Gateway", status: "Scoping", mandays: 2 },
    ];

    render(
      <MemoryRouter>
        <ResourceProjectsCell user={mockUser} projects={projects} />
      </MemoryRouter>,
    );

    const link1 = screen.getByRole("link", { name: "Portal Satu Data" });
    const link2 = screen.getByRole("link", { name: "API Gateway" });

    expect(link1).toHaveAttribute("href", "/projects/10");
    expect(link2).toHaveAttribute("href", "/projects/11");
    expect(link1).toHaveClass("bg-project-chip-bg", "text-project-chip-fg", "rounded-xs");
    expect(screen.queryByRole("button", { name: /lainnya/i })).toBeNull();
  });

  it("menampilkan 2 proyek pertama dan badge '+N lainnya' jika proyek lebih dari 2", async () => {
    const user = userEvent.setup();
    const projects: ResourceProject[] = [
      { id: 1, name: "Proyek Alpha", status: "Assessment", mandays: 5 },
      { id: 2, name: "Proyek Beta", status: "Reporting", mandays: 3 },
      { id: 3, name: "Proyek Gamma", status: "Remediasi", mandays: 2 },
      { id: 4, name: "Proyek Delta", status: "Scoping", mandays: 1 },
    ];

    render(
      <MemoryRouter>
        <ResourceProjectsCell user={mockUser} projects={projects} />
      </MemoryRouter>,
    );

    // 2 proyek pertama tampil sebagai link langsung
    expect(screen.getByRole("link", { name: "Proyek Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Proyek Beta" })).toBeInTheDocument();

    // Proyek ke-3 & 4 belum tampil di luar popover
    expect(screen.queryByRole("link", { name: "Proyek Gamma" })).toBeNull();

    // Ada tombol counter +2 lainnya
    const trigger = screen.getByRole("button", { name: "Lihat semua 4 proyek aktif" });
    expect(trigger).toHaveTextContent("+2 lainnya");

    // Klik tombol untuk membuka Popover
    await user.click(trigger);

    // Popover terbuka dan menampilkan seluruh 4 proyek
    expect(await screen.findByText("Budi Santoso · 4 proyek")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Proyek Gamma" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Proyek Delta" })).toBeInTheDocument();

    // Rincian mandays dan status tampil di popover
    expect(screen.getByText("5 MD")).toBeInTheDocument();
    expect(screen.getByText("3 MD")).toBeInTheDocument();
    expect(screen.getByText("2 MD")).toBeInTheDocument();
    expect(screen.getByText("1 MD")).toBeInTheDocument();
  });
});
