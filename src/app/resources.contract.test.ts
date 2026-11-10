// Beban resource lawan BE asli: dijumlah ulang manual dari API mentah lalu dibandingkan dengan getResourceLoad.
//   CONTRACT_API=http://localhost:8088/api/v1 npx vitest run src/app/resources.contract.test.ts
// Jalankan bersama planner.contract.test dengan --no-file-parallelism: planner menulis mandays sementara ke BE yang sama.
import { beforeAll, describe, expect, it } from "vitest";
import { getResourceLoad, listProjects } from "@/entities/project";
import { useSession } from "@/entities/session";
import { login } from "@/features/auth";
import { listUsers } from "@/entities/user";
import { configureHttpAuth } from "@/shared/api";

const API = process.env.CONTRACT_API;
const run = API ? describe : describe.skip;

run("resource -> BE asli", () => {
  beforeAll(async () => {
    (import.meta.env as Record<string, string>).VITE_API_BASE_URL = API!;
    configureHttpAuth({
      getToken: () => useSession.getState().token,
      onUnauthorized: () => useSession.getState().clear(),
    });
    useSession.getState().setSession(await login({ login: "techlead", password: "Password123!" }));
  });

  it("tech lead boleh membaca daftar user, dan beban cocok dengan penjumlahan mandays mentah proyek aktif", async () => {
    const users = await listUsers();
    expect(users.length).toBeGreaterThanOrEqual(5);
    const load = await getResourceLoad();
    const token = useSession.getState().token!;
    const get = async (path: string) =>
      (await (await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } })).json()).data;
    const { data: projects } = await listProjects({ limit: 100 });
    const expected: Record<number, number> = {};
    for (const p of projects.filter((x: any) => x.status?.status_name !== "Done")) {
      for (const m of (await get(`/projects/${p.project_id}/mandays`)) as {
        pentester_id: number;
        allocated_mandays: number;
      }[])
        expected[m.pentester_id] = (expected[m.pentester_id] ?? 0) + m.allocated_mandays;
    }
    for (const [uid, md] of Object.entries(expected)) expect(load[Number(uid)]!.mandays).toBeCloseTo(md, 5);
    expect(Object.keys(expected).length).toBeGreaterThan(0);
    console.log(
      "beban dari BE:",
      JSON.stringify(
        Object.fromEntries(
          Object.entries(load).map(([k, v]) => [
            users.find((u) => u.sys_user_id === Number(k))?.username,
            `${v.mandays} md / ${v.projects.length} proyek`,
          ]),
        ),
      ),
    );
  });
});
