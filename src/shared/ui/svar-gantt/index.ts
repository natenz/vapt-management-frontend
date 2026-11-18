/**
 * Fondasi bersama SVAR React Gantt (MIT): jembatan tema Willow → token
 * Vermilion, skala kalender, sorotan hari ini, dan tooltip. Dipakai oleh
 * timeline proyek (/projects) dan Gantt tahap di detail proyek.
 */
import "@svar-ui/react-gantt/all.css";
import "./svar-gantt.css";

export { GanttTooltip, GANTT_TOOLTIP_WIDTH } from "./gantt-tooltip";
export {
  TODAY_CELL_CLASS,
  exclusiveEnd,
  getTimelineScales,
  isCurrentPeriod,
  type Granularity,
  type TimelineScaleConfig,
} from "./timeline-scales";
export { useColorScheme, useMediaQuery } from "./use-color-scheme";

/** Kelas sel akhir pekan pada skala harian (lihat svar-gantt.css). */
export const WEEKEND_CELL_CLASS = "vapt-gantt-weekend";
