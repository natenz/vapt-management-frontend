import { apiRequest } from "@/shared/api";
import { calendarSchema, scheduleCheckSchema, type CalendarQuery, type ScheduleCheckQuery } from "../model/types";

/** Jadwal tim: penugasan, cuti, hari libur, dan hari kerja per pentester (maksimal 366 hari). */
export const getCalendar = async (q: CalendarQuery) =>
  (await apiRequest("/calendar", { method: "GET", query: q }, calendarSchema)).data;

/** Peringatan bentrok sebelum asset planner menyimpan penugasan. */
export const checkSchedule = async (q: ScheduleCheckQuery) =>
  (await apiRequest("/calendar/check", { method: "GET", query: q }, scheduleCheckSchema)).data;
