import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { checkSchedule, warningText, type ScheduleCheckQuery } from "@/entities/calendar";

export interface PentesterScheduleWarningsProps {
  /** Nomor urut baris pentester (mulai 1), untuk label aksesibel. */
  index: number;
  projectId?: number;
  pentesterId: number | null;
  start: string;
  end: string;
  md: number;
  mandaysId?: number;
}

/**
 * Peringatan bentrok untuk satu baris pentester di dialog asset: proyek lain, cuti, atau MD melebihi hari kerja.
 * Hanya peringatan; tombol simpan tetap aktif.
 */
export function PentesterScheduleWarnings({ index, projectId, pentesterId, start, end, md, mandaysId }: PentesterScheduleWarningsProps) {
  const ready = Boolean(projectId && pentesterId && start && end && end >= start && md > 0);
  const query: ScheduleCheckQuery | null = ready
    ? {
        pentester_id: pentesterId!,
        from: start,
        to: end,
        allocated_mandays: md,
        project_id: projectId!,
        ...(mandaysId ? { exclude_mandays_id: mandaysId } : {}),
      }
    : null;
  const check = useQuery({
    queryKey: ["schedule-check", query],
    queryFn: () => checkSchedule(query!),
    enabled: ready,
    staleTime: 30_000,
  });
  const warnings = check.data?.warnings ?? [];
  if (warnings.length === 0) return null;
  return (
    <ul aria-label={`Peringatan jadwal pentester ${index}`} className="flex flex-col gap-1 rounded-sm bg-warning-bg px-2.5 py-2 text-caption text-warning">
      {warnings.map((w, i) => (
        <li key={`${w.code}-${i}`} className="flex items-start gap-1.5">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{warningText(w)}</span>
        </li>
      ))}
    </ul>
  );
}
