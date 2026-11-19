import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import type { ProjectDetail } from "@/entities/project";
import { useSession } from "@/entities/session";
import { FindingsPanel } from "./findings-panel";

afterEach(() => {
  cleanup();
  useSession.getState().clear();
});

function renderPanel(status: string, role = "pentester") {
  useSession.setState({
    user: {
      sys_user_id: 5,
      username: "pentester.budi",
      email: "budi@example.com",
      role_id: 1,
      role: { role_id: 1, role_name: role },
    },
  });
  const project: ProjectDetail = {
    project_id: 42,
    project_name: "Portal pengujian",
    client_name: "Telkom",
    total_mandays: 10,
    projected_mandays: 10,
    pm_id: 7,
    status: { status_process_id: 1, status_name: status },
    assets: [],
    mandays: [],
    resources: [],
    stages: [],
  };
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["findings", 42], []);
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <FindingsPanel project={project} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Tambah temuan", () => {
  it.each(["Assessment", "Analysis", "Initial Report", "Retesting", "Final Report Drafting"])(
    "pentester bisa membuka form dari panel kosong saat %s",
    (status) => {
      renderPanel(status);
      expect(screen.getByText("Belum ada temuan tercatat.")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Tambah temuan" })).toHaveAttribute("href", "/projects/42/findings/new");
    },
  );

  it.each(["Draft", "Scoping", "Remediasi", "Final Presentation", "Done"])(
    "pentester tidak bisa menambah temuan saat %s",
    (status) => {
      renderPanel(status);
      expect(screen.queryByRole("link", { name: "Tambah temuan" })).not.toBeInTheDocument();
    },
  );

  it.each(["project_manager", "technical_writer"])("%s tidak mendapat tombol pencatatan", (role) => {
    renderPanel("Assessment", role);
    expect(screen.queryByRole("link", { name: "Tambah temuan" })).not.toBeInTheDocument();
  });

  it("super admin tetap bisa mencatat temuan", () => {
    renderPanel("Final Report Drafting", "super_admin");
    expect(screen.getByRole("link", { name: "Tambah temuan" })).toBeInTheDocument();
  });
});
