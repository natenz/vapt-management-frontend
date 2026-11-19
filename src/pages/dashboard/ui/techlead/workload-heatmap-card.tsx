import { ArrowRight, CalendarRange } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router";
import type { ProjectDetail } from "@/entities/project";
import { toUserProfileInfo, type User } from "@/entities/user";
import { cn } from "@/shared/lib/cn";
import { BentoCard } from "@/shared/ui/bento-grid";
import { Button } from "@/shared/ui/button";
import { weeklyHeatmap } from "../../model/techlead-metrics";
import { CardEmpty, CardError, CardSkeleton } from "../superadmin/card-states";

/*
 * Belum ada aturan batas beban per orang, jadi sel tidak dinilai (tidak ada hijau/merah).
 * Intensitas hanya relatif terhadap MD mingguan tertinggi di tabel agar pola terlihat.
 */
const INTENSITY = ["bg-surface-subtle text-ink-muted", "bg-brand/10 text-ink", "bg-brand/20 text-ink", "bg-brand/35 text-ink"];
const intensity = (booked: number, max: number) =>
  booked <= 0 || max <= 0 ? 0 : Math.min(3, Math.ceil((booked / max) * 3));

const weekLabel = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(`${iso}T00:00:00`));

export function WorkloadHeatmapCard({
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
  const { weeks, rows } = useMemo(() => weeklyHeatmap(pentesters, details, 8), [pentesters, details]);
  const max = useMemo(() => Math.max(0, ...rows.flatMap((r) => r.cells.map((c) => c.booked))), [rows]);

  return (
    <BentoCard
      colSpan={8}
      role="region"
      aria-label="Penugasan Pentester Mingguan"
      title="Penugasan Pentester 8 Minggu ke Depan"
      description="MD terjadwal per minggu kerja (Senin–Jumat) dari penugasan proyek."
      icon={<CalendarRange />}
      action={
        <Button asChild variant="link" trailingIcon={<ArrowRight />} className="h-auto p-0 text-xs">
          <Link to="/resources?tampilan=timeline">Cek Benturan Jadwal di Timeline</Link>
        </Button>
      }
    >
      {error ? (
        <CardError title="Jadwal penugasan belum bisa dimuat" error={error} />
      ) : isLoading ? (
        <CardSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <CardEmpty>Belum ada pentester terdaftar.</CardEmpty>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-1 text-xs">
              <caption className="sr-only">MD terjadwal mingguan pentester</caption>
              <thead>
                <tr>
                  <th scope="col" className="w-40 text-left font-normal text-ink-muted">
                    Pentester
                  </th>
                  {weeks.map((w, i) => (
                    <th key={w.start} scope="col" className="font-normal text-ink-muted">
                      <span className={cn("tabular-nums", i === 0 && "text-brand")}>
                        {i === 0 ? "Minggu ini" : weekLabel(w.start)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const info = toUserProfileInfo(r.user);
                  return (
                    <tr key={r.user.sys_user_id}>
                      <th scope="row" className="max-w-40 truncate text-left font-normal text-ink">
                        {info.name}
                      </th>
                      {r.cells.map((c, i) => (
                        <td
                          key={weeks[i]!.start}
                          title={`${info.name} · ${weekLabel(weeks[i]!.start)}: ${c.booked} MD`}
                          className={cn("h-8 rounded-xs text-center tabular-nums", INTENSITY[intensity(c.booked, max)])}
                        >
                          {c.booked === 0 ? "–" : c.booked}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-caption text-ink-muted">
            Angka = MD terjadwal pada minggu itu. Warna lebih pekat = lebih banyak MD dibanding minggu & orang lain di
            tabel ini, bukan penilaian beban.
          </p>
        </div>
      )}
    </BentoCard>
  );
}
