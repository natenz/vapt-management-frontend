import { z } from "zod";
import { apiRequest } from "@/shared/api";
import {
  calendarSchema,
  holidayCreatedSchema,
  holidaySchema,
  scheduleCheckSchema,
  type CalendarQuery,
  type ScheduleCheckQuery,
} from "../model/types";

/** Jadwal tim: penugasan, hari libur, dan hari kerja per pentester (maksimal 366 hari). */
export const getCalendar = async (q: CalendarQuery) =>
  (await apiRequest("/calendar", { method: "GET", query: q }, calendarSchema)).data;

/** Peringatan bentrok sebelum asset planner menyimpan penugasan. */
export const checkSchedule = async (q: ScheduleCheckQuery) =>
  (await apiRequest("/calendar/check", { method: "GET", query: q }, scheduleCheckSchema)).data;

export const listHolidays = async (year?: number) =>
  (await apiRequest("/holidays", { method: "GET", query: { year } }, z.array(holidaySchema))).data;

export const createHoliday = async (body: { date: string; name: string }) =>
  (await apiRequest("/holidays", { method: "POST", body }, holidayCreatedSchema)).data;

export const deleteHoliday = async (id: number) =>
  (await apiRequest(`/holidays/${id}`, { method: "DELETE" }, z.unknown())).data;
