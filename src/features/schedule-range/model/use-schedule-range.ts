import { useState } from "react";
import type { DateRange, Granularity } from "@/entities/project";
import { getDefaultScheduleRange, resolveGranularity } from "@/entities/project";

export interface ScheduleRangeValue {
  granularity: Granularity;
  range: DateRange;
}

/** Nilai awal: interval Bulan dengan rentang tahun berjalan. */
export function getDefaultScheduleRangeValue(today: Date = new Date()): ScheduleRangeValue {
  return { granularity: "month", range: getDefaultScheduleRange(today) };
}

/**
 * Normalisasi perubahan: bila rentang baru terlalu panjang untuk interval
 * aktif (mis. Hari selama 3 tahun), interval dinaikkan ke tingkat yang valid.
 */
export function normalizeScheduleRange(next: ScheduleRangeValue): ScheduleRangeValue {
  return { ...next, granularity: resolveGranularity(next.range, next.granularity) };
}

/** State bersama interval snapshot + rentang data untuk grafik dan timeline. */
export function useScheduleRange(initial?: ScheduleRangeValue) {
  const [value, setValue] = useState<ScheduleRangeValue>(
    () => initial ?? getDefaultScheduleRangeValue(),
  );
  const onChange = (next: ScheduleRangeValue) => setValue(normalizeScheduleRange(next));
  return { value, onChange } as const;
}
