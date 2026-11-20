import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Pencil, Plus, Trash2, Undo2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addResources,
  createAsset,
  createMandays,
  deleteAsset,
  deleteMandays,
  removeResource,
  updateAsset,
  updateMandays,
  type ProjectDetail,
} from "@/entities/project";
import { listUsers } from "@/entities/user";
import {
  allocate,
  budgetError,
  buildOps,
  CommitError,
  fromServer,
  newKey,
  num,
  runOps,
  totalAssetMandays,
  validate,
  type DraftAsset,
} from "../model/asset-plan";
import { Alert } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { notify } from "@/shared/ui/toast";
import { cn } from "@/shared/lib/cn";
import { AssetDialog, type PentesterPerson } from "./asset-dialog";

const sel = "h-9 w-full rounded-sm border border-border-control bg-surface px-2 text-input text-ink focus-ring";
const fmt = (n: number) => (Number.isFinite(n) ? String(Math.round(n * 100) / 100) : "-");

const shortDate = (iso: string) =>
  iso ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(`${iso}T00:00:00`)) : "?";

/**
 * Perencanaan aset + assign pentester. Aset diisi/diubah lewat modal (`AssetDialog`); hasilnya tampil
 * sebagai kartu ringkasan di daftar. Semua perubahan hanya ada di state (draf) sampai tombol "Simpan"
 * ditekan. Mandays tiap pentester = mandays aset dibagi jumlah pentester (bisa diisi manual).
 */
export function AssetPlanner({ project, canAssign }: { project: ProjectDetail; canAssign: boolean }) {
  const qc = useQueryClient();
  const server = useMemo(() => fromServer(project), [project]);
  const serverTw = useMemo(
    () =>
      project.resources
        .filter((r) => r.user?.sys_user?.role?.role_name === "technical_writer")
        .map((r) => ({ resourceId: r.resource_id, userId: r.user_id, name: r.user?.full_name ?? `User ${r.user_id}` })),
    [project.resources],
  );
  const serverTwIds = useMemo(() => serverTw.map((t) => t.userId), [serverTw]);
  const [drafts, setDrafts] = useState<DraftAsset[]>(server);
  // `base` = snapshot server yang jadi dasar draf. Diff dan simpan selalu terhadap base, bukan terhadap data yang baru masuk.
  const [base, setBase] = useState<DraftAsset[]>(server);
  const [twDraftIds, setTwDraftIds] = useState<number[]>(serverTwIds);
  const [baseTwIds, setBaseTwIds] = useState<number[]>(serverTwIds);
  const [stale, setStale] = useState(false);
  const justSaved = useRef(false);

  const sameIds = (a: number[], b: number[]) =>
    a.length === b.length && a.every((x) => b.includes(x));

  useEffect(() => {
    const serverChanged = buildOps(base, server).length > 0 || !sameIds(serverTwIds, baseTwIds);
    if (!serverChanged) return;
    const edited = buildOps(base, drafts).length > 0 || !sameIds(baseTwIds, twDraftIds);
    if (justSaved.current || !edited) {
      // simpan sendiri (penuh/sebagian) atau belum ada suntingan: ikut data server
      justSaved.current = false;
      setBase(server);
      setDrafts(server);
      setBaseTwIds(serverTwIds);
      setTwDraftIds(serverTwIds);
      setStale(false);
    } else {
      // server berubah SAAT ada suntingan: jangan timpa draf, jangan simpan di atas data yang tidak dilihat user
      setStale(true);
    }
  }, [server, serverTwIds]);

  useEffect(() => {
    if (!buildOps(base, drafts).length && sameIds(baseTwIds, twDraftIds)) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [base, drafts, baseTwIds, twDraftIds]);

  const writers = useQuery({
    queryKey: ["users", "technical_writer"],
    queryFn: () => listUsers({ role: "technical_writer", limit: 100 }),
    enabled: canAssign,
  });

  const pentesters = useQuery({
    queryKey: ["users", "pentester"],
    queryFn: () => listUsers({ role: "pentester", limit: 100 }),
    enabled: canAssign,
  });

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [failure, setFailure] = useState<string | null>(null);

  const people = useMemo<PentesterPerson[]>(() => {
    const map = new Map<number, PentesterPerson>();

    // 1. Masukkan semua pentester dari katalog sistem (listUsers)
    for (const u of pentesters.data ?? []) {
      if (u.sys_user_id) {
        const fullName = u.profile?.full_name?.trim();
        map.set(u.sys_user_id, {
          sys_user_id: u.sys_user_id,
          userId: u.profile?.user_id,
          name: fullName || u.username || `Pentester ${u.sys_user_id}`,
        });
      }
    }

    // 2. Gabungkan atau lengkapi dengan yang ada di project.resources
    for (const r of project.resources) {
      const isPentester =
        r.user?.sys_user?.role?.role_name === "pentester" ||
        map.has(r.user?.sys_user?.sys_user_id ?? 0) ||
        map.has(r.user?.sys_user_id ?? 0);

      const sysId = r.user?.sys_user?.sys_user_id ?? r.user?.sys_user_id;
      if (isPentester && sysId) {
        const existing = map.get(sysId);
        const name =
          r.user?.full_name?.trim() ||
          r.user?.sys_user?.profile?.full_name?.trim() ||
          r.user?.sys_user?.username ||
          existing?.name ||
          `User ${r.user_id}`;

        map.set(sysId, {
          sys_user_id: sysId,
          userId: r.user_id ?? r.user?.user_id ?? existing?.userId,
          name,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [pentesters.data, project.resources]);
  const nameOf = (id: number | null) => {
    const u = people.find((x) => x.sys_user_id === id);
    return u?.name ?? "";
  };
  const twCatalog = (writers.data ?? []).filter((u) => u.profile?.user_id != null);
  const twNameOf = (userId: number) => {
    const fromServer = serverTw.find((t) => t.userId === userId);
    if (fromServer) return fromServer.name;
    const fromCatalog = twCatalog.find((u) => u.profile?.user_id === userId);
    return fromCatalog?.profile?.full_name ?? fromCatalog?.username ?? `User ${userId}`;
  };
  const availableTws = twCatalog.filter((u) => !twDraftIds.includes(u.profile!.user_id));

  const twDirty = !sameIds(baseTwIds, twDraftIds);
  const dirty = useMemo(() => buildOps(base, drafts).length > 0 || twDirty, [base, drafts, twDirty]);
  const patch = (key: string, p: Partial<DraftAsset>) =>
    setDrafts((d) => d.map((a) => (a.key === key ? { ...a, ...p } : a)));
  // Modal isian aset: null = tertutup. Salinan draf diedit di modal, baru masuk daftar saat diterapkan.
  const [editing, setEditing] = useState<{ draft: DraftAsset; isNew: boolean } | null>(null);
  const range = { start: project.start_date?.slice(0, 10) ?? "", end: project.end_date?.slice(0, 10) ?? "" };
  const addAsset = () =>
    setEditing({ draft: { key: newKey(), name: "", type: "web", domain: "", ip: "", mandays: "", pentesters: [] }, isNew: true });
  const editAsset = (a: DraftAsset) =>
    setEditing({ draft: { ...a, pentesters: a.pentesters.map((r) => ({ ...r })) }, isNew: false });
  const withDraft = (d: DraftAsset) =>
    drafts.some((x) => x.key === d.key) ? drafts.map((x) => (x.key === d.key ? d : x)) : [...drafts, d];
  const checkDraft = (d: DraftAsset) => {
    const own = validate([d], { start: project.start_date, end: project.end_date }, base)[d.key] ?? [];
    const over = budgetError(withDraft(d), project.projected_mandays);
    return over ? [...own, over] : own;
  };
  const applyDraft = (d: DraftAsset) => {
    setDrafts(withDraft(d));
    setErrors((e) => {
      const rest = { ...e };
      delete rest[d.key];
      return rest;
    });
    setEditing(null);
  };
  const removeAsset = (a: DraftAsset) =>
    a.id != null ? patch(a.key, { removed: true }) : setDrafts((d) => d.filter((x) => x.key !== a.key));

  const save = useMutation({
    mutationFn: async () => {
      const bad = validate(drafts, { start: project.start_date, end: project.end_date }, base, project.projected_mandays);
      setErrors(bad);
      if (Object.keys(bad).length > 0) throw new Error("__validasi__");

      // Cek pentester yang di-assign namun belum ada di project.resources
      const assignedSysUserIds = new Set<number>();
      for (const asset of drafts) {
        if (asset.removed) continue;
        for (const p of asset.pentesters) {
          if (p.pentesterId) {
            assignedSysUserIds.add(p.pentesterId);
          }
        }
      }

      const existingResourceSysIds = new Set<number>();
      for (const r of project.resources) {
        const sid = r.user?.sys_user?.sys_user_id ?? r.user?.sys_user_id;
        if (sid) existingResourceSysIds.add(sid);
      }

      const pentesterUserIdsToAdd: number[] = [];
      for (const sysId of assignedSysUserIds) {
        if (!existingResourceSysIds.has(sysId)) {
          const person = people.find((p) => p.sys_user_id === sysId);
          if (person?.userId) {
            pentesterUserIdsToAdd.push(person.userId);
          }
        }
      }

      if (pentesterUserIdsToAdd.length > 0) {
        await addResources(project.project_id, pentesterUserIdsToAdd);
      }

      const ops = buildOps(base, drafts);
      await runOps(ops, {
        createAsset: (b) => createAsset(project.project_id, b),
        updateAsset: (id, b) => updateAsset(id, b),
        deleteAsset,
        createMandays: (assetId, b) =>
          createMandays(project.project_id, { asset_id: assetId, status: "planned", ...b }),
        updateMandays: (id, b) => updateMandays(id, b),
        deleteMandays,
      });
      const toAdd = twDraftIds.filter((id) => !baseTwIds.includes(id));
      const toRemove = serverTw.filter((t) => baseTwIds.includes(t.userId) && !twDraftIds.includes(t.userId));
      if (toAdd.length > 0) {
        await addResources(project.project_id, toAdd);
      }
      for (const t of toRemove) {
        await removeResource(project.project_id, t.resourceId);
      }
      return ops.length + pentesterUserIdsToAdd.length + toAdd.length + toRemove.length;
    },
    onSuccess: (n) => {
      justSaved.current = true;
      setFailure(null);
      void qc.invalidateQueries({ queryKey: ["project", project.project_id] });
      void qc.invalidateQueries({ queryKey: ["projects"] });
      void qc.invalidateQueries({ queryKey: ["workload"] });
      notify.success("Perencanaan tersimpan", { description: `${n} perubahan disimpan.` });
    },
    onError: (e) => {
      if (e.message === "__validasi__") {
        setFailure(null);
        return;
      }
      if (e instanceof CommitError) justSaved.current = true;
      void qc.invalidateQueries({ queryKey: ["project", project.project_id] });
      setFailure(
        e instanceof CommitError
          ? `${e.message} Berhenti di langkah ${e.done + 1} dari ${e.total}; ${e.done} perubahan sebelumnya sudah tersimpan dan kini tampil di tabel. Isi ulang bagian yang belum tersimpan, lalu simpan lagi.`
          : e.message,
      );
    },
  });

  const shown = drafts.filter((a) => !a.removed);
  const removed = drafts.filter((a) => a.removed);
  const projected = project.projected_mandays;
  const used = totalAssetMandays(drafts);
  const overBudget = budgetError(drafts, projected) !== null;
  const allErrors = Object.values(errors).flat();
  const hasMissing = shown.some((a) => a.pentesters.length === 0);
  const canDeleteSavedAssets = ["Draft", "Scoping"].includes(project.status?.status_name ?? "");

  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-6" aria-labelledby="planner">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="planner" className="text-title-md text-ink">
            Asset dan penugasan pentester
          </h2>
          <p className="text-body-sm text-ink-muted">
            Isi asset beserta mandays-nya.{" "}
            {canAssign
              ? "Tambahkan pentester di bawah tiap asset; mandays mereka otomatis dibagi rata dari mandays asset. "
              : ""}
            Mandays pentester bisa diubah manual (total tidak boleh melebihi mandays asset); kosongkan untuk otomatis.
            Perubahan baru disimpan saat Anda menekan Simpan.
          </p>
        </div>
        <span className="flex gap-2">
          <Button type="button" leadingIcon={<Plus />} onClick={addAsset}>
            Tambah asset
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!dirty || save.isPending}
            onClick={() => {
              setDrafts(base);
              setTwDraftIds(baseTwIds);
              setErrors({});
              setFailure(null);
            }}
          >
            Batalkan perubahan
          </Button>
          <Button
            type="button"
            variant="solid"
            loading={save.isPending}
            disabled={!dirty || stale}
            onClick={() => save.mutate()}
          >
            Simpan
          </Button>
        </span>
      </div>

      {projected > 0 ? (
        <p className={cn("rounded-sm border px-3 py-2 text-body-sm tabular", overBudget ? "border-error text-error" : "border-border text-ink-secondary")} role={overBudget ? "alert" : undefined}>
          Mandays proyeksi: <strong>{fmt(projected)} md</strong> · terpakai asset: <strong>{fmt(used)} md</strong> ·{" "}
          {overBudget ? `lebih ${fmt(used - projected)} md, kurangi mandays asset` : `sisa ${fmt(projected - used)} md`}
        </p>
      ) : (
        <p className="text-caption text-ink-muted">Mandays proyeksi belum ditetapkan, jadi total mandays asset belum dibatasi.</p>
      )}

      {stale ? (
        <Alert tone="warning" title="Data proyek di server berubah saat Anda mengedit" compact>
          Draf Anda belum ditimpa, tapi Simpan dinonaktifkan agar tidak menimpa perubahan itu.
          <Button
            type="button"
            variant="outline"
            leadingIcon={<Undo2 />}
            onClick={() => {
              setBase(server);
              setDrafts(server);
              setBaseTwIds(serverTwIds);
              setTwDraftIds(serverTwIds);
              setStale(false);
              setErrors({});
            }}
          >
            Buang draf dan muat ulang
          </Button>
        </Alert>
      ) : null}

      {dirty ? (
        <Alert tone="info" title="Ada perubahan yang belum disimpan" compact>
          Daftar di bawah masih draf. Server belum berubah.
        </Alert>
      ) : null}

      {failure ? (
        <Alert tone="error" title="Penyimpanan terhenti" compact>
          {failure}
        </Alert>
      ) : null}

      {allErrors.length > 0 ? (
        <Alert tone="error" title="Periksa isian berikut" compact>
          <ul className="list-disc pl-5">
            {allErrors.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {shown.length === 0 ? (
        <p className="text-body-sm text-ink-muted">Belum ada asset. Tekan "Tambah asset".</p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Asset yang diuji">
          {shown.map((a, idx) => {
            const md = num(a.mandays);
            const alloc = allocate(md > 0 ? md : 0, a.pentesters);
            const label = a.name.trim() || `Asset ${idx + 1}`;
            return (
              <li
                key={a.key}
                className={cn(
                  "flex flex-col gap-3 rounded-md border border-border bg-surface p-4",
                  errors[a.key] && "border-error bg-error-bg",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-title-sm text-ink">{label}</span>
                      {a.id == null ? <Badge variant="tag">draf</Badge> : null}
                    </span>
                    <span className="text-body-sm text-ink-muted">
                      {a.type} · {[a.domain, a.ip].filter(Boolean).join(" · ") || "-"}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="mr-2 text-body-sm text-ink-secondary tabular">{fmt(md)} md</span>
                    <Button type="button" variant="quiet" aria-label={`Ubah asset ${label}`} onClick={() => editAsset(a)}>
                      <Pencil />
                    </Button>
                    {a.id == null || canDeleteSavedAssets ? <Button
                      type="button"
                      variant="quiet"
                      aria-label={`Hapus asset ${a.name || "baru"}`}
                      onClick={() => removeAsset(a)}
                    >
                      <Trash2 />
                    </Button> : null}
                  </span>
                </div>
                {canAssign ? (
                  a.pentesters.length === 0 ? (
                    <p className="text-caption text-warning">Belum ada pentester.</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5 border-t border-border pt-3" aria-label={`Pentester ${label}`}>
                      {a.pentesters.map((r, i) => (
                        <li key={r.key} className="flex flex-wrap items-center justify-between gap-2 text-body-sm">
                          <span className="text-ink">{nameOf(r.pentesterId) || "Pentester belum dipilih"}</span>
                          <span className="flex items-center gap-3 text-caption text-ink-muted tabular">
                            <span className="inline-flex items-center gap-1">
                              <CalendarRange className="size-3.5" aria-hidden />
                              {shortDate(r.start)} – {shortDate(r.end)}
                            </span>
                            <span className="text-ink-secondary">
                              {fmt(r.md.trim() ? num(r.md) : (alloc.shares[i] ?? NaN))} md
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <AssetDialog
        initial={editing?.draft ?? null}
        isNew={editing?.isNew ?? true}
        canAssign={canAssign}
        people={people}
        defaultRange={range}
        check={checkDraft}
        onApply={applyDraft}
        onClose={() => setEditing(null)}
      />

      {removed.length > 0 ? (
        <ul className="flex flex-col gap-1 text-body-sm text-ink-muted" aria-label="Asset yang akan dihapus">
          {removed.map((a) => (
            <li key={a.key} className="flex items-center gap-2">
              <span className="line-through">{a.name}</span> akan dihapus saat disimpan.
              <Button
                type="button"
                variant="quiet"
                leadingIcon={<Undo2 />}
                onClick={() => patch(a.key, { removed: false })}
              >
                Batalkan
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {canAssign ? (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-subtle p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-overline text-ink-muted uppercase">Assign Technical Writer</span>
            <span className="text-caption text-ink-muted">
              {twDraftIds.length === 0
                ? "Belum ada Technical Writer"
                : `${twDraftIds.length} Technical Writer dipilih`}
            </span>
          </div>
          {twDraftIds.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {twDraftIds.map((uid) => (
                <span
                  key={uid}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 py-1 text-body-sm text-ink"
                >
                  <span>{twNameOf(uid)}</span>
                  <button
                    type="button"
                    aria-label={`Hapus Technical Writer ${twNameOf(uid)}`}
                    className="rounded-sm p-0.5 text-ink-muted hover:text-ink focus-ring"
                    onClick={() => setTwDraftIds((ids) => ids.filter((x) => x !== uid))}
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <select
            aria-label="Tambah Technical Writer"
            className={sel}
            value=""
            disabled={availableTws.length === 0}
            onChange={(e) => {
              const id = Number(e.target.value);
              if (id && !twDraftIds.includes(id)) setTwDraftIds((ids) => [...ids, id]);
            }}
          >
            <option value="">
              {availableTws.length === 0
                ? twCatalog.length === 0
                  ? "Tidak ada data Technical Writer"
                  : "Semua Technical Writer sudah ditambahkan"
                : "+ Tambah Technical Writer"}
            </option>
            {availableTws.map((u) => (
              <option key={u.sys_user_id} value={u.profile!.user_id}>
                {u.profile?.full_name ?? u.username}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {canAssign && shown.length > 0 && hasMissing ? (
        <p className="text-caption text-ink-muted">
          Setiap asset perlu minimal 1 pentester sebelum proyek bisa masuk stage Pentest.
        </p>
      ) : null}
    </section>
  );
}
