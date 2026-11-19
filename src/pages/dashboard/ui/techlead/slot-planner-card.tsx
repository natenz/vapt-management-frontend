import { CalendarPlus, CalendarSearch, CheckCircle2, CircleAlert, Clock, OctagonAlert, Star } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import type { ProjectDetail } from "@/entities/project";
import { toUserProfileInfo, type User } from "@/entities/user";
import { cn } from "@/shared/lib/cn";
import { fmtDate } from "@/shared/lib/format";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { StatusChip } from "@/shared/ui/badge";
import { BentoCard } from "@/shared/ui/bento-grid";
import { Button } from "@/shared/ui/button";
import { Field, Input } from "@/shared/ui/input";
import {
  addDaysIso,
  findEarliestSlot,
  loadInRange,
  mondayOf,
  todayIso,
  workingDays,
  type LoadLevel,
} from "../../model/techlead-metrics";
import { CardEmpty, CardError, CardSkeleton } from "../superadmin/card-states";

export const LEVEL_META: Record<
  LoadLevel,
  { label: string; tone: "success" | "warning" | "error"; bar: string; icon: ReactNode }
> = {
  free: { label: "Longgar", tone: "success", bar: "bg-success", icon: <CheckCircle2 /> },
  busy: { label: "Padat", tone: "warning", bar: "bg-warning", icon: <Clock /> },
  full: { label: "Penuh", tone: "error", bar: "bg-error", icon: <OctagonAlert /> },
};

const clampInt = (v: string, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min ? Math.min(n, max) : fallback;
};

export function SlotPlannerCard({
  pentesters,
  details,
  isLoading,
  error,
}: {
  pentesters: readonly User[];
  details: readonly ProjectDetail[];
  isLoading: boolean;
  error: unknown;
}) {
  const today = todayIso();
  const [start, setStart] = useState(() => addDaysIso(mondayOf(today), 7));
  const [duration, setDuration] = useState("14");
  const [team, setTeam] = useState("2");

  const durationDays = clampInt(duration, 1, 180, 14);
  const teamSize = clampInt(team, 1, Math.max(1, pentesters.length), 1);
  const validStart = /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : today;
  const end = addDaysIso(validStart, durationDays - 1);

  const ranked = useMemo(
    () => loadInRange(pentesters, details, validStart, end),
    [pentesters, details, validStart, end],
  );
  const freeCount = ranked.filter((r) => r.level === "free").length;
  const fits = freeCount >= teamSize;
  const suggestion = useMemo(
    () =>
      fits
        ? null
        : findEarliestSlot({ pentesters, details, durationDays, teamSize, from: addDaysIso(today, 1) }),
    [fits, pentesters, details, durationDays, teamSize, today],
  );

  return (
    <BentoCard
      colSpan={5}
      role="region"
      aria-label="Perencana Slot Proyek Baru"
      title="Perencana Slot Proyek Baru"
      description="Cek siapa yang longgar di rentang tanggal proyek berikutnya."
      icon={<CalendarSearch />}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
          <Field label="Tanggal mulai">
            {(f) => <Input {...f} type="date" value={start} onChange={(e) => setStart(e.target.value)} />}
          </Field>
          <Field label="Durasi (hari)">
            {(f) => (
              <Input
                {...f}
                type="number"
                min={1}
                max={180}
                inputMode="numeric"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            )}
          </Field>
          <Field label="Jumlah pentester">
            {(f) => (
              <Input
                {...f}
                type="number"
                min={1}
                max={Math.max(1, pentesters.length)}
                inputMode="numeric"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
              />
            )}
          </Field>
        </div>

        {error ? (
          <CardError title="Jadwal penugasan belum bisa dimuat" error={error} />
        ) : isLoading ? (
          <CardSkeleton rows={5} />
        ) : pentesters.length === 0 ? (
          <CardEmpty>Belum ada pentester terdaftar.</CardEmpty>
        ) : (
          <>
            <div
              role="status"
              className={cn(
                "flex flex-col gap-2 rounded-md p-3 text-xs",
                fits ? "bg-success-bg text-success" : "bg-warning-bg text-warning",
              )}
            >
              <span className="flex items-start gap-2">
                {fits ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                ) : (
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                )}
                <span>
                  {fmtDate(validStart)} – {fmtDate(end)} · {workingDays(validStart, end)} hari kerja.{" "}
                  {fits
                    ? `${freeCount} pentester longgar, cukup untuk tim ${teamSize} orang.`
                    : `Hanya ${freeCount} pentester longgar, butuh ${teamSize}.`}
                </span>
              </span>
              {!fits ? (
                suggestion ? (
                  <span className="flex flex-wrap items-center justify-between gap-2 pl-6">
                    <span>
                      Slot tercepat: <strong className="font-medium">{fmtDate(suggestion.start)}</strong> –{" "}
                      {fmtDate(suggestion.end)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setStart(suggestion.start)}
                    >
                      Pakai slot ini
                    </Button>
                  </span>
                ) : (
                  <span className="pl-6">Tidak ada slot cukup longgar dalam 12 minggu ke depan.</span>
                )
              ) : null}
            </div>

            <ul className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto" aria-label="Peringkat ketersediaan">
              {ranked.map((r, i) => {
                const info = toUserProfileInfo(r.user);
                const pick = fits && i < teamSize;
                const meta = LEVEL_META[r.level];
                return (
                  <li key={r.user.sys_user_id} className="flex flex-col gap-1.5 py-2.5">
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <Avatar size="sm" className="shrink-0">
                          <AvatarFallback>{info.initials}</AvatarFallback>
                        </Avatar>
                        <span className="truncate text-xs text-ink">{info.name}</span>
                        {pick ? (
                          <span className="inline-flex items-center gap-1 rounded-xs bg-brand/10 px-1.5 py-0.5 text-caption text-brand">
                            <Star className="size-3" aria-hidden />
                            Rekomendasi
                          </span>
                        ) : null}
                      </span>
                      <StatusChip tone={meta.tone} icon={meta.icon}>
                        {meta.label}
                      </StatusChip>
                    </span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-surface-subtle" aria-hidden>
                      <span
                        className={cn("block h-full rounded-full", meta.bar)}
                        style={{ width: `${Math.min(100, Math.round(r.utilization * 100))}%` }}
                      />
                    </span>
                    <span className="flex flex-wrap justify-between gap-x-3 text-caption text-ink-muted">
                      <span className="tabular-nums">
                        Terpakai {r.booked}/{r.capacity} MD · sisa {r.free} MD
                      </span>
                      {r.projects.length > 0 ? (
                        <span className="truncate">{r.projects.map((p) => p.name).join(", ")}</span>
                      ) : (
                        <span>Tanpa penugasan</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>

            <Button asChild variant="solid" leadingIcon={<CalendarPlus />}>
              <Link to={`/projects/new?mulai=${validStart}&selesai=${end}`}>Buat proyek dengan jadwal ini</Link>
            </Button>
          </>
        )}
      </div>
    </BentoCard>
  );
}
