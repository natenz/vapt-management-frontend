import { AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { warningShort, type CalendarBooking, type TeamCalendar as CalendarData } from "@/entities/calendar";
import { cn } from "@/shared/lib/cn";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Skeleton } from "@/shared/ui/skeleton";
import { dayEntries, monthWeeks, weekOf, type CalendarMode, type DayInfo } from "../model/grid";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const longDate = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "numeric", timeZone: "UTC" });
const asDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const MAX_LINES = 3;

const bookingLabel = (b: CalendarBooking) => (b.masked ? "Proyek lain" : b.project_code || b.project_name);

interface Line {
  key: string;
  text: string;
  tone: "booking" | "leave" | "pending";
  warn: boolean;
}

function dayLines(day: DayInfo): Line[] {
  const lines: Line[] = [];
  for (const e of day.entries) {
    if (e.leave) {
      lines.push({
        key: `l${e.person.sys_user_id}`,
        text: `${e.person.name} · ${e.leave.status === "approved" ? "Cuti" : "Cuti (menunggu)"}`,
        tone: e.leave.status === "approved" ? "leave" : "pending",
        warn: false,
      });
    }
    for (const b of e.bookings) {
      lines.push({ key: `b${b.mandays_id}`, text: `${e.person.name} · ${bookingLabel(b)}`, tone: "booking", warn: b.warnings.length > 0 });
    }
  }
  return lines;
}

const LINE_CLASS: Record<Line["tone"], string> = {
  booking: "bg-project-chip-bg text-project-chip-fg",
  leave: "bg-warning-bg text-warning",
  pending: "border border-dashed border-border-strong bg-surface text-ink-secondary",
};

export interface TeamCalendarProps {
  data: CalendarData | undefined;
  isLoading: boolean;
  mode: CalendarMode;
  /** Tanggal acuan (YYYY-MM-DD): bulan atau minggu yang ditampilkan. */
  anchor: string;
}

/** Kalender jadwal tim: penugasan, cuti, hari libur, dan ketersediaan per hari. */
export function TeamCalendar({ data, isLoading, mode, anchor }: TeamCalendarProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const people = useMemo(() => data?.people ?? [], [data]);
  const holidays = useMemo(() => data?.holidays ?? [], [data]);
  const info = (iso: string) => dayEntries(people, holidays, iso);

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <>
      {mode === "bulan" ? (
        <MonthGrid month={anchor.slice(0, 7)} info={info} onSelect={setSelected} />
      ) : (
        <WeekTable days={weekOf(anchor)} info={info} people={people.map((p) => p.name)} onSelect={setSelected} />
      )}
      <Legend />
      <DayDialog day={selected ? info(selected) : null} onClose={() => setSelected(null)} />
    </>
  );
}

function MonthGrid({ month, info, onSelect }: { month: string; info: (iso: string) => DayInfo; onSelect: (iso: string) => void }) {
  const weeks = monthWeeks(month);
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <div className="grid min-w-[720px] grid-cols-7 border-b border-border bg-surface-subtle">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-1.5 text-center text-caption font-medium text-ink-muted">
            {d}
          </div>
        ))}
      </div>
      <div className="grid min-w-[720px] grid-cols-7">
        {weeks.flat().map((iso) => {
          const day = info(iso);
          const lines = dayLines(day);
          const outside = iso.slice(0, 7) !== month;
          return (
            <button
              key={iso}
              type="button"
              aria-label={`${longDate.format(asDate(iso))}, lihat detail`}
              onClick={() => onSelect(iso)}
              className={cn(
                "flex min-h-28 flex-col gap-1 border-b border-r border-border p-1.5 text-left transition-colors hover:bg-surface-subtle focus-ring",
                (day.weekend || day.holiday) && "bg-surface-subtle",
                outside && "text-ink-muted",
              )}
            >
              <span className="flex items-baseline justify-between gap-1">
                <span className={cn("text-body-sm tabular-nums", outside ? "text-ink-muted" : "text-ink")}>{Number(iso.slice(8))}</span>
                {day.weekend ? (
                  <span className="text-caption text-ink-muted">Nonkerja</span>
                ) : !day.holiday ? (
                  <span className="text-caption text-ink-muted">{day.available} tersedia</span>
                ) : null}
              </span>
              {day.holiday ? <span className="truncate rounded-xs bg-error-bg px-1 text-caption text-error">{day.holiday.name}</span> : null}
              {lines.slice(0, MAX_LINES).map((l) => (
                <span key={l.key} className={cn("flex items-center gap-1 truncate rounded-xs px-1 text-caption", LINE_CLASS[l.tone])}>
                  {l.warn ? <AlertTriangle className="size-3 shrink-0 text-error" aria-label="Ada peringatan bentrok" /> : null}
                  <span className="truncate">{l.text}</span>
                </span>
              ))}
              {lines.length > MAX_LINES ? <span className="text-caption text-ink-muted">+{lines.length - MAX_LINES} lainnya</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekTable({
  days,
  info,
  people,
  onSelect,
}: {
  days: string[];
  info: (iso: string) => DayInfo;
  people: string[];
  onSelect: (iso: string) => void;
}) {
  const columns = days.map(info);
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table aria-label="Jadwal mingguan tim" className="w-full min-w-[720px] border-collapse text-body-sm">
        <thead className="bg-surface-subtle">
          <tr>
            <th scope="col" className="px-3 py-2 text-left text-caption font-medium text-ink-muted">
              Pentester
            </th>
            {columns.map((d, i) => (
              <th key={d.iso} scope="col" className="px-2 py-2 text-left text-caption font-medium text-ink-muted">
                <button type="button" onClick={() => onSelect(d.iso)} className="rounded-xs hover:text-ink focus-ring" aria-label={`${longDate.format(asDate(d.iso))}, lihat detail`}>
                  {WEEKDAYS[i]} {shortDate.format(asDate(d.iso))}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {people.map((name, row) => (
            <tr key={`${name}-${row}`} className="border-t border-border">
              <th scope="row" className="px-3 py-2 text-left font-normal text-ink">
                {name}
              </th>
              {columns.map((d) => {
                const e = d.entries[row]!;
                return (
                  <td key={d.iso} className={cn("px-2 py-2 align-top", (d.weekend || d.holiday) && "bg-surface-subtle")}>
                    {d.weekend ? (
                      <span className="text-caption text-ink-muted">Nonkerja</span>
                    ) : d.holiday ? (
                      <span className="text-caption text-error">Libur</span>
                    ) : (
                      <span className="flex flex-col gap-1">
                        {e.leave ? (
                          <span className={cn("rounded-xs px-1 text-caption", LINE_CLASS[e.leave.status === "approved" ? "leave" : "pending"])}>
                            {e.leave.status === "approved" ? "Cuti" : "Cuti (menunggu)"}
                          </span>
                        ) : null}
                        {e.bookings.map((b) => (
                          <span key={b.mandays_id} className={cn("flex items-center gap-1 rounded-xs px-1 text-caption", LINE_CLASS.booking)}>
                            {b.warnings.length > 0 ? <AlertTriangle className="size-3 shrink-0 text-error" aria-label="Ada peringatan bentrok" /> : null}
                            {bookingLabel(b)}
                          </span>
                        ))}
                        {!e.leave && e.bookings.length === 0 ? <span className="text-caption text-ink-muted">–</span> : null}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Legend() {
  const items: [string, string][] = [
    ["Terbooking", LINE_CLASS.booking],
    ["Cuti", LINE_CLASS.leave],
    ["Cuti menunggu", LINE_CLASS.pending],
    ["Libur", "bg-error-bg text-error"],
    ["Nonkerja", "bg-surface-subtle text-ink-muted"],
  ];
  return (
    <ul className="mt-3 flex flex-wrap items-center gap-3 text-caption text-ink-muted" aria-label="Keterangan warna">
      {items.map(([label, cls]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className={cn("inline-block size-3 rounded-xs", cls)} aria-hidden />
          {label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <AlertTriangle className="size-3 text-error" aria-hidden />
        Bentrok
      </li>
    </ul>
  );
}

function DayDialog({ day, onClose }: { day: DayInfo | null; onClose: () => void }) {
  return (
    <Dialog open={day !== null} onOpenChange={(o) => (o ? undefined : onClose())}>
      {day ? (
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Detail jadwal · {longDate.format(asDate(day.iso))}</DialogTitle>
            <DialogDescription>
              {day.weekend
                ? "Akhir pekan, bukan hari kerja."
                : day.holiday
                  ? `Hari libur: ${day.holiday.name}.`
                  : `${day.available} pentester tersedia.`}
            </DialogDescription>
          </DialogHeader>
          <ul className="mt-4 flex flex-col divide-y divide-border">
            {day.entries.map((e) => (
              <li key={e.person.sys_user_id} className="flex flex-col gap-1 py-2.5">
                <span className="text-title-sm text-ink">{e.person.name}</span>
                {e.leave ? (
                  <span className="text-body-sm text-warning">
                    {e.leave.status === "approved" ? "Cuti disetujui" : "Cuti menunggu persetujuan"}
                  </span>
                ) : null}
                {e.bookings.map((b) => (
                  <span key={b.mandays_id} className="flex flex-wrap items-center gap-1.5 text-body-sm text-ink-secondary">
                    {b.masked ? (
                      <span>Proyek lain</span>
                    ) : (
                      <Link to={`/projects/${b.project_id}`} className="rounded-xs text-brand focus-ring hover:underline">
                        {b.project_name}
                      </Link>
                    )}
                    {b.asset_name ? <span>· {b.asset_name}</span> : null}
                    <span className="tabular-nums">· {b.allocated_mandays} MD</span>
                    {b.warnings.map((w) => (
                      <span key={w} className="inline-flex items-center gap-1 rounded-xs bg-error-bg px-1.5 text-caption text-error">
                        <AlertTriangle className="size-3" aria-hidden />
                        {warningShort(w)}
                      </span>
                    ))}
                  </span>
                ))}
                {!e.leave && e.bookings.length === 0 && !day.weekend && !day.holiday ? (
                  <span className="text-body-sm text-success">Tersedia</span>
                ) : null}
              </li>
            ))}
          </ul>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
