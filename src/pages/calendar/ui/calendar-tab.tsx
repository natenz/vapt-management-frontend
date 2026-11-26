import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { getCalendar, type TeamCalendar as CalendarData } from "@/entities/calendar";
import { fmtDate } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { SegmentedTabsList, SegmentedTabsTrigger, Tabs } from "@/shared/ui/tabs";
import { gridRange, shiftAnchor, TeamCalendar, type CalendarMode } from "@/widgets/team-calendar";

const select = "h-9 rounded-sm border border-border-control bg-surface px-3 text-body-sm text-ink focus-ring";
const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
const pad = (n: number) => String(n).padStart(2, "0");

/** Tanggal lokal hari ini sebagai YYYY-MM-DD. */
export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Penyaringan di FE: peringatan tetap dihitung BE dari seluruh jadwal orang itu. */
function applyFilters(data: CalendarData | undefined, personId: number, projectId: number): CalendarData | undefined {
  if (!data || (!personId && !projectId)) return data;
  const people = data.people
    .filter((p) => !personId || p.sys_user_id === personId)
    .map((p) => (projectId ? { ...p, bookings: p.bookings.filter((b) => b.project_id === projectId) } : p))
    .filter((p) => !projectId || p.bookings.length > 0);
  return { ...data, people };
}

export function CalendarTab({ isPentester }: { isPentester: boolean }) {
  const [sp, setSp] = useSearchParams();
  const mode: CalendarMode = sp.get("tampilan") === "minggu" ? "minggu" : "bulan";
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(sp.get("tanggal") ?? "") ? sp.get("tanggal")! : todayIso();
  const personId = Number(sp.get("orang")) || 0;
  const projectId = Number(sp.get("proyek")) || 0;
  const set = (key: string, value: string | null) =>
    setSp(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (value) p.set(key, value);
        else p.delete(key);
        return p;
      },
      { replace: true },
    );

  const range = gridRange(mode, anchor);
  const calendar = useQuery({
    queryKey: ["calendar", range.from, range.to],
    queryFn: () => getCalendar(range),
  });

  const projects = useMemo(() => {
    const seen = new Map<number, string>();
    for (const p of calendar.data?.people ?? []) {
      for (const b of p.bookings) if (!b.masked && b.project_id) seen.set(b.project_id, b.project_name);
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [calendar.data]);
  const shown = useMemo(() => applyFilters(calendar.data, personId, projectId), [calendar.data, personId, projectId]);

  const label =
    mode === "bulan" ? monthLabel.format(new Date(`${anchor.slice(0, 7)}-01T00:00:00Z`)) : `${fmtDate(range.from)} – ${fmtDate(range.to)}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" aria-label="Periode sebelumnya" onClick={() => set("tanggal", shiftAnchor(mode, anchor, -1))}>
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <span className="min-w-40 text-center text-title-sm text-ink">{label}</span>
          <Button type="button" variant="outline" aria-label="Periode berikutnya" onClick={() => set("tanggal", shiftAnchor(mode, anchor, 1))}>
            <ChevronRight className="size-4" aria-hidden />
          </Button>
          <Button type="button" variant="quiet" onClick={() => set("tanggal", null)}>
            Hari ini
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={mode} onValueChange={(v) => set("tampilan", v === "minggu" ? "minggu" : null)}>
            <SegmentedTabsList aria-label="Tampilan kalender">
              <SegmentedTabsTrigger value="bulan">Bulanan</SegmentedTabsTrigger>
              <SegmentedTabsTrigger value="minggu">Mingguan</SegmentedTabsTrigger>
            </SegmentedTabsList>
          </Tabs>
          {!isPentester ? (
            <select aria-label="Filter pentester" className={select} value={personId || ""} onChange={(e) => set("orang", e.target.value || null)}>
              <option value="">Semua pentester</option>
              {(calendar.data?.people ?? []).map((p) => (
                <option key={p.sys_user_id} value={p.sys_user_id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : null}
          <select aria-label="Filter proyek" className={select} value={projectId || ""} onChange={(e) => set("proyek", e.target.value || null)}>
            <option value="">Semua proyek</option>
            {projects.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {calendar.error ? (
        <Alert tone="error" title="Kalender belum bisa dimuat">
          {calendar.error.message}
        </Alert>
      ) : (
        <TeamCalendar data={shown} isLoading={calendar.isLoading} mode={mode} anchor={anchor} />
      )}
    </div>
  );
}
