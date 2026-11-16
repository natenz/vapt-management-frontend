import { Circle, OctagonAlert, Trash2 } from "lucide-react";
import type { User } from "@/entities/user";
import { Button } from "@/shared/ui/button";
import { Combobox, type ComboOption } from "@/shared/ui/combobox";
import { StatusBadge } from "@/shared/ui/badge";
import { Field } from "@/shared/ui/input";
import { isOverLimit, MANDAYS_LIMIT } from "@/shared/config/workload";

export type TeamPickerProps = {
  value: number[];
  onChange: (ids: number[]) => void;
  pentesters: User[];
  writers: User[];
  /** sys_user_id -> total mandays aktif (dari BE). Writer tidak punya mandays, jadi tidak ditampilkan. */
  workload: Record<number, number>;
  /** Bulan beban dihitung, mis. "November 2026". */
  monthLabel?: string;
};

const name = (u: User) => u.profile?.full_name ?? u.username;

/** Pilih anggota tim lewat select + tombol tambah. Beban mandays tiap orang merah bila >= batas. */
export function TeamPicker({ value, onChange, pentesters, writers, workload, monthLabel }: TeamPickerProps) {
  const mdOf = (u: User) => workload[u.sys_user_id] ?? 0;
  const isPentester = (u: User) => u.role?.role_name === "pentester";
  const over = (u: User) => isPentester(u) && isOverLimit(mdOf(u));
  const all = [...pentesters, ...writers].filter((u) => u.profile?.user_id);
  const chosen = all.filter((u) => value.includes(u.profile!.user_id));
  const toOpt = (group: string) => (u: User): ComboOption => ({
    value: String(u.profile!.user_id),
    label: name(u),
    group,
    hint: isPentester(u) ? `${mdOf(u)} md${over(u) ? " · lewat batas" : ""}` : undefined,
    warn: over(u),
  });
  const options = [
    ...pentesters.filter((u) => u.profile?.user_id && !value.includes(u.profile.user_id)).map(toOpt("Pentester")),
    ...writers.filter((u) => u.profile?.user_id && !value.includes(u.profile.user_id)).map(toOpt("Technical Writer")),
  ];

  return (
    <div className="flex flex-col gap-4">
      <Field label="Anggota tim" helper={`Ketik nama untuk mencari, lalu pilih. Angka = mandays pentester${monthLabel ? ` di ${monthLabel}` : ""} (reset tiap bulan), merah bila lebih dari ${MANDAYS_LIMIT} md.`}>
        {(f) => (
          <Combobox
            {...f}
            options={options}
            placeholder="Cari nama pentester atau writer"
            emptyText="Tidak ada orang yang cocok"
            onSelect={(v) => onChange([...value, Number(v)])}
          />
        )}
      </Field>

      {chosen.length === 0 ? (
        <p className="text-body-sm text-ink-muted">Belum ada anggota dipilih.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-sm border border-border">
          {chosen.map((u) => {
            const full = over(u);
            return (
              <li key={u.sys_user_id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex flex-col">
                  <span className="text-title-sm text-ink">{name(u)}</span>
                  <span className="text-body-sm text-ink-muted">{u.role?.role_name === "pentester" ? "Pentester" : "Technical Writer"}</span>
                </span>
                <span className="flex items-center gap-3">
                  {isPentester(u) ? (
                    <StatusBadge tone={full ? "error" : "neutral"} icon={full ? <OctagonAlert aria-hidden /> : <Circle className="fill-current" aria-hidden />}>
                      {mdOf(u)} md{full ? " · lewat batas" : ""}
                    </StatusBadge>
                  ) : null}
                  <Button
                    type="button"
                    variant="quiet"
                    aria-label={`Hapus ${name(u)}`}
                    onClick={() => onChange(value.filter((x) => x !== u.profile!.user_id))}
                  >
                    <Trash2 />
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
