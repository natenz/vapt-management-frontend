import { useQuery } from "@tanstack/react-query";
import { CalendarOff, ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams } from "react-router";
import { listHolidays } from "@/entities/calendar";
import { AddHolidayForm, DeleteHolidayButton } from "@/features/manage-holidays";
import { fmtDate } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

export function HolidayTab({ canManage }: { canManage: boolean }) {
  const [sp, setSp] = useSearchParams();
  const year = Number(sp.get("tahun")) || new Date().getFullYear();
  const setYear = (y: number) =>
    setSp(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set("tahun", String(y));
        return p;
      },
      { replace: true },
    );
  const holidays = useQuery({ queryKey: ["holidays", year], queryFn: () => listHolidays(year) });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-ink-muted">
        Sabtu dan Minggu otomatis bukan hari kerja. Hari libur di sini mengurangi hari kerja efektif semua pentester dan diarsir di kalender.
      </p>
      {canManage ? <AddHolidayForm /> : null}
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" aria-label="Tahun sebelumnya" onClick={() => setYear(year - 1)}>
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <span className="min-w-16 text-center text-title-sm text-ink tabular-nums">{year}</span>
        <Button type="button" variant="outline" aria-label="Tahun berikutnya" onClick={() => setYear(year + 1)}>
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
      {holidays.error ? (
        <Alert tone="error" title="Hari libur belum bisa dimuat">
          {holidays.error.message}
        </Alert>
      ) : holidays.isLoading ? (
        <Skeleton className="h-32" />
      ) : (holidays.data ?? []).length === 0 ? (
        <EmptyState icon={<CalendarOff />} title={`Belum ada hari libur di ${year}`} description="Tambahkan hari libur nasional atau internal di sini." />
      ) : (
        <Table boxed aria-label={`Hari libur ${year}`}>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Nama</TableHead>
              {canManage ? <TableHead>Aksi</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(holidays.data ?? []).map((h) => (
              <TableRow key={h.holiday_id}>
                <TableCell>{fmtDate(h.date)}</TableCell>
                <TableCell>{h.name}</TableCell>
                {canManage ? (
                  <TableCell>
                    <DeleteHolidayButton holiday={h} />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
