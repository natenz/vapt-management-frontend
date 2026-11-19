import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { allocate, ASSET_TYPES, newKey, num, type DraftAsset, type DraftPentester } from "../model/asset-plan";

const sel = "h-9 w-full rounded-sm border border-border-control bg-surface px-3 text-body-sm text-ink focus-ring";
const fmt = (n: number) => (Number.isFinite(n) ? String(Math.round(n * 100) / 100) : "-");

export interface PentesterPerson {
  sys_user_id: number;
  userId?: number;
  name: string;
}

export interface AssetDialogProps {
  /** Aset yang sedang diisi; null = modal tertutup. */
  initial: DraftAsset | null;
  isNew: boolean;
  canAssign: boolean;
  people: readonly PentesterPerson[];
  defaultRange: { start: string; end: string };
  /** Kembalikan daftar error untuk draf ini; kosong = boleh diterapkan. */
  check: (draft: DraftAsset) => string[];
  onApply: (draft: DraftAsset) => void;
  onClose: () => void;
}

/**
 * Modal isian satu aset beserta pentester-nya. Hanya mengubah draf lokal modal;
 * "Terapkan" memindahkan hasilnya ke daftar aset (masih draf sampai Simpan).
 */
export function AssetDialog({ initial, isNew, canAssign, people, defaultRange, check, onApply, onClose }: AssetDialogProps) {
  const [a, setA] = useState<DraftAsset | null>(initial);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    setA(initial);
    setErrors([]);
  }, [initial]);

  if (!a) return <Dialog open={false} />;

  const patch = (p: Partial<DraftAsset>) => setA((x) => (x ? { ...x, ...p } : x));
  const patchRow = (rk: string, p: Partial<DraftPentester>) =>
    patch({ pentesters: a.pentesters.map((r) => (r.key === rk ? { ...r, ...p } : r)) });

  const md = num(a.mandays);
  const alloc = allocate(md > 0 ? md : 0, a.pentesters);
  const assignedIds = new Set(a.pentesters.map((p) => p.pentesterId).filter(Boolean));
  const availablePentesters = people.filter((p) => !assignedIds.has(p.sys_user_id));

  const addPentesterWithId = (pentesterId: number) => {
    patch({
      pentesters: [
        ...a.pentesters,
        {
          key: newKey(),
          pentesterId,
          start: defaultRange.start,
          end: defaultRange.end,
          md: "",
        },
      ],
    });
  };

  const apply = () => {
    const errs = check(a);
    setErrors(errs);
    if (errs.length === 0) onApply(a);
  };

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent size="lg" className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Tambah aset" : `Ubah aset ${a.name || ""}`.trim()}</DialogTitle>
          <DialogDescription>
            Isi data aset beserta mandays-nya.
            {canAssign ? " Mandays pentester dibagi rata otomatis; isi manual bila perlu." : ""}
          </DialogDescription>
        </DialogHeader>

        <form
          className="mt-6 flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          {errors.length > 0 ? (
            <Alert tone="error" title="Periksa isian berikut" compact>
              <ul className="list-disc pl-5">
                {errors.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-12">
            <label className="flex flex-col gap-1 sm:col-span-6">
              <span className="text-caption text-ink-muted">Nama aset</span>
              <Input aria-label="Nama aset" value={a.name} placeholder="Mobile App" onChange={(e) => patch({ name: e.target.value })} className="h-9" />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-3">
              <span className="text-caption text-ink-muted">Tipe</span>
              <select aria-label="Tipe aset" className={sel} value={a.type} onChange={(e) => patch({ type: e.target.value })}>
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
                onChange={(e) => patch({ mandays: e.target.value })}
                className="h-9 text-right"
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-7">
              <span className="text-caption text-ink-muted">Domain</span>
              <Input aria-label="Domain" value={a.domain} placeholder="portal.contoh.co.id" onChange={(e) => patch({ domain: e.target.value })} className="h-9" />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-5">
              <span className="text-caption text-ink-muted">IP address</span>
              <Input aria-label="IP address" value={a.ip} placeholder="10.0.0.1" onChange={(e) => patch({ ip: e.target.value })} className="h-9" />
            </label>
          </div>

          {canAssign ? (
            <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-subtle p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-overline uppercase text-ink-muted">Assign pentester</span>
                <span className="flex flex-wrap items-center gap-3 text-caption text-ink-muted">
                  {a.pentesters.length === 0 ? (
                    "Belum ada pentester"
                  ) : !(md > 0) ? (
                    "Isi mandays aset untuk menghitung alokasi"
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
                </span>
              </div>

              {/* Dropdown pemilih tambah pentester */}
              <div className="flex flex-col gap-1">
                <select
                  aria-label="Tambah pentester"
                  className={sel}
                  value=""
                  disabled={availablePentesters.length === 0}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    if (id) addPentesterWithId(id);
                  }}
                >
                  <option value="" disabled hidden>
                    + Tambah pentester
                  </option>
                  <option value="" disabled>
                    {availablePentesters.length === 0
                      ? people.length === 0
                        ? "Tidak ada data pentester"
                        : "Semua pentester sudah ditambahkan"
                      : "+ Tambah pentester (Pilih dari daftar)"}
                  </option>
                  {availablePentesters.map((u) => (
                    <option key={u.sys_user_id} value={u.sys_user_id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Kartu daftar pentester yang sudah dipilih */}
              {a.pentesters.map((r, i) => {
                const person = people.find((u) => u.sys_user_id === r.pentesterId);
                const pName = person?.name || (r.pentesterId ? `Pentester ${r.pentesterId}` : "Belum dipilih");
                return (
                  <div
                    key={r.key}
                    className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3.5"
                  >
                    {/* Baris 1: Bar pemilihan pentester (satu baris sendiri) + tombol hapus */}
                    <div className="flex items-center gap-2">
                      <label className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-caption font-medium text-ink">Pentester {i + 1}</span>
                        <select
                          aria-label={`Pentester ${i + 1} untuk ${a.name || "aset baru"}`}
                          className={sel}
                          value={r.pentesterId ?? ""}
                          onChange={(e) =>
                            patchRow(r.key, {
                              pentesterId: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                        >
                          {r.pentesterId ? (
                            <option value={r.pentesterId}>{pName}</option>
                          ) : (
                            <option value="">Pilih pentester</option>
                          )}
                          {availablePentesters.map((u) => (
                            <option key={u.sys_user_id} value={u.sys_user_id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="flex flex-col justify-end pt-5">
                        <Button
                          type="button"
                          variant="quiet"
                          className="size-9 text-ink-muted hover:text-error"
                          aria-label={`Hapus pentester ${i + 1}`}
                          onClick={() =>
                            patch({
                              pentesters: a.pentesters.filter((x) => x.key !== r.key),
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Baris 2: Tanggal mulai, Tanggal selesai, dan Mandays */}
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      <label className="flex flex-col gap-1">
                        <span className="text-caption text-ink-muted">Tanggal mulai</span>
                        <Input
                          aria-label={`Mulai pentester ${i + 1}`}
                          type="date"
                          value={r.start}
                          onChange={(e) => patchRow(r.key, { start: e.target.value })}
                          className="h-9"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-caption text-ink-muted">Tanggal selesai</span>
                        <Input
                          aria-label={`Selesai pentester ${i + 1}`}
                          type="date"
                          value={r.end}
                          onChange={(e) => patchRow(r.key, { end: e.target.value })}
                          className="h-9"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-caption text-ink-muted">Mandays</span>
                        <Input
                          aria-label={`Mandays pentester ${i + 1}`}
                          type="number"
                          min={0.5}
                          step="0.5"
                          value={r.md}
                          placeholder={md > 0 ? fmt(alloc.shares[i]!) : "otomatis"}
                          title="Kosongkan untuk dibagi otomatis"
                          onChange={(e) => patchRow(r.key, { md: e.target.value })}
                          className="h-9 text-right"
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="quiet" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" variant="solid">
              {isNew ? "Tambahkan ke daftar" : "Terapkan perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
