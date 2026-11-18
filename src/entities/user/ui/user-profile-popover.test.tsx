import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  TeamResourcesPopover,
  UserProfilePopover,
  toUserProfileInfo,
} from "./user-profile-popover";

describe("UserProfilePopover", () => {
  const user = toUserProfileInfo({
    sys_user_id: 10,
    username: "pm.andi",
    email: "pm.andi@vapt.local",
    role: { role_name: "project_manager" },
    profile: {
      user_id: 10,
      full_name: "Andi Wijaya",
      department: "Project Management",
      phone_number: "081200000002",
    },
  });

  it("membuka popover profil pengguna dan menampilkan informasi kontak", () => {
    render(
      <UserProfilePopover user={user}>
        <button type="button">Buka Profil PM</button>
      </UserProfilePopover>,
    );

    const trigger = screen.getByRole("button", { name: "Buka Profil PM" });
    fireEvent.click(trigger);

    expect(screen.getByText("Andi Wijaya")).toBeInTheDocument();
    expect(screen.getByText("@pm.andi")).toBeInTheDocument();
    expect(screen.getByText("Project Management")).toBeInTheDocument();
    expect(screen.getByText("pm.andi@vapt.local")).toBeInTheDocument();
    expect(screen.getByText("081200000002")).toBeInTheDocument();
  });
});

describe("TeamResourcesPopover", () => {
  const members = [
    toUserProfileInfo({
      sys_user_id: 20,
      username: "pentester.budi",
      email: "budi@vapt.local",
      role: { role_name: "pentester" },
      profile: { user_id: 20, full_name: "Budi Santoso", department: "Offensive Security" },
    }),
    toUserProfileInfo({
      sys_user_id: 21,
      username: "writer.eka",
      email: "eka@vapt.local",
      role: { role_name: "technical_writer" },
      profile: { user_id: 21, full_name: "Eka Putri", department: "Technical Writing" },
    }),
  ];

  it("menampilkan daftar anggota tim dan peran mereka saat dibuka", () => {
    render(
      <TeamResourcesPopover members={members}>
        <button type="button">Lihat Tim</button>
      </TeamResourcesPopover>,
    );

    const trigger = screen.getByRole("button", { name: "Lihat Tim" });
    fireEvent.click(trigger);

    expect(screen.getByText("Anggota Tim Proyek")).toBeInTheDocument();
    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText("@pentester.budi")).toBeInTheDocument();
    expect(screen.getByText("Eka Putri")).toBeInTheDocument();
    expect(screen.getByText("@writer.eka")).toBeInTheDocument();
  });
});
