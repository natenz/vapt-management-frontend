// Tes kontrak FE <-> BE asli. Jalan hanya bila BE hidup dan seed sudah diisi:
//   CONTRACT_API=http://localhost:8088/api/v1 npx vitest run src/app/contract.test.ts
import { beforeAll, describe, expect, it } from "vitest";
import { listCatalog } from "@/entities/catalog";
import { getReport, listFindings } from "@/entities/finding";
import { getProject, listMandays, listProjects, listResources, listStatuses, listStatusLogs } from "@/entities/project";
import { listRoles, listUsers } from "@/entities/user";
import { useSession } from "@/entities/session";
import { login, me } from "@/features/auth/api";
import { configureHttpAuth } from "@/shared/api";

const API = process.env.CONTRACT_API;
const run = API ? describe : describe.skip;

run("kontrak FE <-> BE", () => {
  beforeAll(() => {
    (import.meta.env as Record<string, string>).VITE_API_BASE_URL = API!;
    configureHttpAuth({ getToken: () => useSession.getState().token, onUnauthorized: () => useSession.getState().clear() });
  });
  const as = async (u: string, p = "Password123!") => useSession.getState().setSession(await login({ login: u, password: p }));

  it("login + me semua role", async () => {
    for (const [u, role] of [["superadmin", "super_admin"], ["techlead", "tech_lead"], ["pm.andi", "project_manager"], ["pentester.budi", "pentester"], ["writer.eka", "technical_writer"]] as const) {
      await as(u, u === "superadmin" ? "ChangeMe123!" : "Password123!");
      const m = await me();
      expect(m.role?.role_name).toBe(role);
    }
  });

  it("superadmin: user, role, status, katalog, semua proyek", async () => {
    await as("superadmin", "ChangeMe123!");
    expect((await listUsers()).length).toBeGreaterThanOrEqual(8);
    expect((await listRoles()).length).toBeGreaterThanOrEqual(5);
    expect((await listStatuses()).map((s) => s.status_name)).toContain("Pentest");
    expect((await listCatalog()).length).toBeGreaterThanOrEqual(8);
    const { data } = await listProjects({ limit: 100 });
    expect(data.length).toBeGreaterThanOrEqual(7);
    for (const p of data) {
      const d = await getProject(p.project_id);
      await listResources(p.project_id);
      await listMandays(p.project_id);
      await listStatusLogs(p.project_id);
      await listFindings(p.project_id);
      if (["Reporting", "Remediation", "Retest", "Done"].includes(d.status?.status_name ?? "")) {
        const r = await getReport(p.project_id);
        expect(r.summary.total_findings).toBe(r.findings.length);
      }
    }
  });

  it("pentester hanya melihat proyek miliknya", async () => {
    await as("superadmin", "ChangeMe123!");
    const all = (await listProjects({ limit: 100 })).data.length;
    await as("pentester.budi");
    const mine = (await listProjects({ limit: 100 })).data.length;
    expect(mine).toBeGreaterThan(0);
    expect(mine).toBeLessThan(all);
  });

  it("401 untuk kredensial salah", async () => {
    await expect(login({ login: "superadmin", password: "salah" })).rejects.toMatchObject({ status: 401 });
  });
});
