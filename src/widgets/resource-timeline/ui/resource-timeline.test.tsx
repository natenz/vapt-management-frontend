import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { ProjectDetail } from "@/entities/project";
import type { User } from "@/entities/user";
import type { ScheduleRangeValue } from "@/features/schedule-range";
import { ResourceTimeline } from "./resource-timeline";

vi.mock("@svar-ui/react-gantt", () => ({
  Gantt: ({ tasks }: { tasks: { id: string; text: string }[] }) => (
    <div data-testid="resource-gantt">
      {tasks.map((t) => (
        <div key={t.id} className="wx-bar">
          {t.text}
        </div>
      ))}
    </div>
  ),
  Willow: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  locateTask: () => null,
}));
vi.mock("@svar-ui/react-gantt/all.css", () => ({}));

const mockUsers: User[] = [
  {
    sys_user_id: 5,
    username: "pentester.budi",
    email: "budi@telkom.co.id",
    role_id: 1,
    role: { role_id: 1, role_name: "pentester" },
    profile: { user_id: 5, full_name: "Budi Santoso", department: "OffSec" },
  },
];

const mockProjects = [
  {
    project_id: 1,
    project_name: "Portal Telkom",
    start_date: "2026-11-01",
    end_date: "2026-11-30",
    mandays: [
      {
        mandays_id: 10,
        pentester_id: 5,
        start_date: "2026-11-05",
        end_date: "2026-11-20",
        allocated_mandays: 10,
        asset: { asset_name: "API" },
      },
    ],
    resources: [],
  },
] as unknown as ProjectDetail[];

const mockSchedule: ScheduleRangeValue = {
  granularity: "day",
  range: {
    start: new Date("2026-11-01T00:00:00"),
    end: new Date("2026-11-30T00:00:00"),
  },
};

describe("ResourceTimeline", () => {
  it("merender SVAR gantt dengan task personil dan penugasan", () => {
    render(
      <MemoryRouter>
        <ResourceTimeline
          users={mockUsers}
          projects={mockProjects}
          schedule={mockSchedule}
          onScheduleChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    const gantt = screen.getByTestId("resource-gantt");
    expect(gantt).toBeInTheDocument();
    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText(/Portal Telkom · API/)).toBeInTheDocument();
  });

  it("menampilkan toolbar pencarian dan filter", () => {
    render(
      <MemoryRouter>
        <ResourceTimeline
          users={mockUsers}
          projects={mockProjects}
          schedule={mockSchedule}
          onScheduleChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByPlaceholderText("Cari personil atau proyek..."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Role/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Kapasitas/i })).toBeInTheDocument();
  });
});
