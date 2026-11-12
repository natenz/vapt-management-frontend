import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Undo2, UserPlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createAsset,
  createMandays,
  deleteAsset,
  deleteMandays,
  updateAsset,
  updateMandays,
  type ProjectDetail,
} from "@/entities/project";
import {
  allocate,
  ASSET_TYPES,
  buildOps,
  CommitError,
  fromServer,
  newKey,
  num,
  runOps,
  validate,
  type DraftAsset,
  type DraftPentester,
} from "../model/asset-plan";
import { Alert } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { notify } from "@/shared/ui/toast";
import { cn } from "@/shared/lib/cn";

const sel = "h-9 w-full rounded-sm border border-border-control bg-surface px-2 text-input text-ink focus-ring";
const fmt = (n: number) => (Number.isFinite(n) ? String(Math.round(n * 100) / 100) : "-");

/**
 * Perencanaan aset + assign pentester sebagai tabel yang bisa diedit. Semua perubahan hanya ada di state
 * (draft) sampai tombol "Simpan ke server" ditekan. Mandays tiap pentester = mandays aset dibagi jumlah pentester.
 */
export function AssetPlanner({ project, canAssign }: { project: ProjectDetail; canAssign: boolean }) {
  const qc = useQueryClient();
  const server = useMemo(() => fromServer(project), [project]);
  const [drafts, setDrafts] = useState<DraftAsset[]>(server);
  // `base` = snapshot server yang jadi dasar draf. Diff dan simpan selalu terhadap base, bukan terhadap data yang baru masuk.
  const [base, setBase] = useState<DraftAsset[]>(server);
  const [stale, setStale] = useState(false);
  const justSaved = useRef(false);

  useEffect(() => {
    if (server === base) return;
    const edited = buildOps(base, drafts).length > 0;
    if (justSaved.current || !edited) {
      // simpan sendiri (penuh/sebagian) atau belum ada suntingan: ikut data server
      justSaved.current = false;
      setBase(server);
      setDrafts(server);
      setStale(false);
    } else {
      // server berubah SAAT ada suntingan: jangan timpa draf, jangan simpan di atas data yang tidak dilihat user
      setStale(true);
    }
  }, [server]);

  useEffect(() => {
    if (!buildOps(base, drafts).length) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [base, drafts]);

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [failure, setFailure] = useState<string | null>(null);

  const people = project.resources
    .map((r) => r.user?.sys_user)
    .filter((u): u is NonNullable<typeof u> => Boolean(u) && u?.role?.role_name === "pentester");
  const nameOf = (id: number | null) => {
    const u = people.find((x) => x.sys_user_id === id);
    return u?.profile?.full_name ?? u?.username ?? "";
  };

  const dirty = useMemo(() => buildOps(base, drafts).length > 0, [base, drafts]);
  const patch = (key: string, p: Partial<DraftAsset>) =>
    setDrafts((d) => d.map((a) => (a.key === key ? { ...a, ...p } : a)));
  const patchRow = (key: string, rk: string, p: Partial<DraftPentester>) =>
    setDrafts((d) =>
      d.map((a) =>
        a.key === key
          ? { ...a, pentesters: a.pentesters.map((r) => (r.key === rk ? { ...r, ...p } : r)) }
          : a,
      ),
    );
  const addAsset = () =>
    setDrafts((d) => [...d, { key: newKey(), name: "", type: "web", domain: "", ip: "", mandays: "", pentesters: [] }]);
  const addPentester = (a: DraftAsset) =>
    patch(a.key, {
      pentesters: [
        ...a.pentesters,
        {
          key: newKey(),
          pentesterId: null,
          start: project.start_date?.slice(0, 10) ?? "",
          end: project.end_date?.slice(0, 10) ?? "",
          md: "",
        },
      ],
    });
  const removeAsset = (a: DraftAsset) =>
    a.id != null ? patch(a.key, { removed: true }) : setDrafts((d) => d.filter((x) => x.key !== a.key));

  const save = useMutation({
    mutationFn: async () => {
      const bad = validate(drafts, { start: project.start_date, end: project.end_date }, base);
      setErrors(bad);
      if (Object.keys(bad).length > 0) throw new Error("__validasi__");
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
      return ops.length;
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
  const allErrors = Object.values(errors).flat();
  const hasMissing = shown.some((a) => a.pentesters.length === 0);

  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-6" aria-labelledby="planner">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="planner" className="text-title-md text-ink">
            Aset dan penugasan pentester
          </h2>
          <p className="text-body-sm text-ink-muted">
            Isi aset beserta mandays-nya.{" "}
            {canAssign
              ? "Tambahkan pentester di bawah tiap aset; mandays mereka otomatis dibagi rata dari mandays aset. "
              : ""}
            Mandays pentester bisa diubah manual (total tidak boleh melebihi mandays aset); kosongkan untuk otomatis.
            Perubahan baru disimpan saat Anda menekan Simpan.
          </p>
        </div>
        <span className="flex gap-2">
          <Button type="button" leadingIcon={<Plus />} onClick={addAsset}>
            Tambah aset
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!dirty || save.isPending}
            onClick={() => {
              setDrafts(base);
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

      {stale ? (
        <Alert tone="warning" title="Data proyek di server berubah saat Anda mengedit" compact>
          Draf Anda belum ditimpa, tapi Simpan dinonaktifkan agar tidak menimpa perubahan itu.
          <Button
            type="button"
            variant="outline"
            className="ml-3"
            onClick={() => {
              setBase(server);
              setDrafts(server);
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
        <p className="text-body-sm text-ink-muted">Belum ada aset. Tekan "Tambah aset".</p>
      ) : (
        <div className="flex flex-col gap-4" aria-label="Aset yang diuji">
          {shown.map((a, idx) => {
            const md = num(a.mandays);
            const alloc = allocate(md > 0 ? md : 0, a.pentesters);
            const shares = alloc.shares;
            const isNew = a.id == null;
            return (
              <div
                key={a.key}
                className={cn(
                  "overflow-hidden rounded-md border border-border bg-surface",
                  errors[a.key] && "border-error bg-error-bg",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    <span className="text-title-sm text-ink">{a.name.trim() || `Aset ${idx + 1}`}</span>
                    {isNew ? <Badge variant="tag">draf</Badge> : null}
                    <span className="text-caption text-ink-muted tabular">
                      · {a.pentesters.length} pentester
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="quiet"
                    aria-label={`Hapus aset ${a.name || "baru"}`}
                    onClick={() => removeAsset(a)}
                  >
                    <Trash2 />
                  </Button>
                </div>

                <div className="grid gap-3 p-4 sm:grid-cols-12">
                  <label className="flex flex-col gap-1 sm:col-span-6">
                    <span className="text-caption text-ink-muted">Nama aset</span>
                    <Input
                      aria-label="Nama aset"
                      value={a.name}
                      placeholder="Mobile App"
                      onChange={(e) => patch(a.key, { name: e.target.value })}
                      className="h-9"
                    />
                  </label>
                  <label className="flex flex-col gap-1 sm:col-span-3">
                    <span className="text-caption text-ink-muted">Tipe</span>
                    <select
                      aria-label="Tipe aset"
                      className={sel}
                      value={a.type}
                      onChange={(e) => patch(a.key, { type: e.target.value })}
                    >
                      {ASSET_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 sm:col-span-3">
                    <span className="text-caption text-ink-muted">Mandays</span>
                    <Input
                      aria-label="Mandays aset"
                      type="number"
                      min={0.5}
                      step="0.5"
                      value={a.mandays}
                      placeholder="20"
                      onChange={(e) => patch(a.key, { mandays: e.target.value })}
                      className="h-9 text-right"
                    />
                  </label>
                  <label className="flex flex-col gap-1 sm:col-span-7">
                    <span className="text-caption text-ink-muted">Domain</span>
                    <Input
                      aria-label="Domain"
                      value={a.domain}
                      placeholder="portal.contoh.co.id"
                      onChange={(e) => patch(a.key, { domain: e.target.value })}
                      className="h-9"
                    />
                  </label>
                  <label className="flex flex-col gap-1 sm:col-span-5">
                    <span className="text-caption text-ink-muted">IP address</span>
                    <Input
                      aria-label="IP address"
                      value={a.ip}
                      placeholder="10.0.0.1"
                      onChange={(e) => patch(a.key, { ip: e.target.value })}
                      className="h-9"
                    />
                  </label>
                </div>

                {canAssign ? (
                  <div className="flex flex-col gap-2 border-t border-border bg-surface-subtle p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-overline text-ink-muted uppercase">Assign pentester</span>
                      <span className="flex flex-wrap items-center gap-3 text-caption text-ink-muted">
                        {a.pentesters.length === 0 || !(md > 0) ? (
                          "Belum ada pentester"
                        ) : (
                          <span className={cn(alloc.remaining < 0 && "font-medium text-error")}>
                            {`Dialokasikan ${fmt(md - alloc.remaining)} dari ${fmt(md)} md`}
                            {alloc.remaining > 0
                              ? ` · sisa ${fmt(alloc.remaining)} md`
                              : alloc.remaining < 0
                                ? ` · lebih ${fmt(-alloc.remaining)} md`
                                : ""}
                          </span>
                        )}
                        <Button type="button" leadingIcon={<UserPlus />} onClick={() => addPentester(a)}>
                          Tambah pentester
                        </Button>
                      </span>
                    </div>
                    {a.pentesters.map((r, i) => (
                      <div
                        key={r.key}
                        className="grid items-center gap-2 md:grid-cols-[minmax(0,1.5fr)_8.75rem_8.75rem_6rem_auto]"
                      >
                        <select
                          aria-label={`Pentester ${i + 1} untuk ${a.name || "aset baru"}`}
                          className={sel}
                          value={r.pentesterId ?? ""}
                          onChange={(e) =>
                            patchRow(a.key, r.key, {
                              pentesterId: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                        >
                          <option value="">Pilih pentester</option>
                          {people.map((u) => (
                            <option key={u.sys_user_id} value={u.sys_user_id}>
                              {nameOf(u.sys_user_id)}
                            </option>
                          ))}
                        </select>
                        <Input
                          aria-label={`Mulai pentester ${i + 1}`}
                          type="date"
                          value={r.start}
                          onChange={(e) => patchRow(a.key, r.key, { start: e.target.value })}
                          className="h-9"
                        />
                        <Input
                          aria-label={`Selesai pentester ${i + 1}`}
                          type="date"
                          value={r.end}
                          onChange={(e) => patchRow(a.key, r.key, { end: e.target.value })}
                          className="h-9"
                        />
                        <Input
                          aria-label={`Mandays pentester ${i + 1}`}
                          type="number"
                          min={0.5}
                          step="0.5"
                          value={r.md}
                          placeholder={md > 0 ? fmt(shares[i]!) : "otomatis"}
                          title="Kosongkan untuk dibagi otomatis"
                          onChange={(e) => patchRow(a.key, r.key, { md: e.target.value })}
                          className="h-9 text-right"
                        />
                        <Button
                          type="button"
                          variant="quiet"
                          aria-label={`Hapus pentester ${i + 1}`}
                          onClick={() =>
                            patch(a.key, {
                              pentesters: a.pentesters.filter((x) => x.key !== r.key),
                            })
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {removed.length > 0 ? (
        <ul className="flex flex-col gap-1 text-body-sm text-ink-muted" aria-label="Aset yang akan dihapus">
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
      {canAssign && shown.length > 0 && hasMissing ? (
        <p className="text-caption text-ink-muted">
          Setiap aset perlu minimal 1 pentester sebelum proyek bisa masuk tahap Pentest.
        </p>
      ) : null}
    </section>
  );
}
