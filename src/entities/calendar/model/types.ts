import {
  calendarSchema,
  holidayCreatedSchema,
  holidaySchema,
  scheduleCheckSchema,
  SCHEDULE_WARNINGS,
  type CalendarBooking,
  type CalendarPerson,
  type Holiday,
  type HolidayCreated,
  type ScheduleConflict,
  type ScheduleCheck,
  type ScheduleWarning,
  type ScheduleWarningCode,
  type TeamCalendar,
} from "@/shared/api/schemas";

export { calendarSchema, holidayCreatedSchema, holidaySchema, scheduleCheckSchema, SCHEDULE_WARNINGS };
export type {
  CalendarBooking,
  CalendarPerson,
  Holiday,
  HolidayCreated,
  ScheduleConflict,
  ScheduleCheck,
  ScheduleWarning,
  ScheduleWarningCode,
  TeamCalendar,
};

export type CalendarQuery = { from: string; to: string; user_id?: number; project_id?: number };

export type ScheduleCheckQuery = {
  pentester_id: number;
  from: string;
  to: string;
  allocated_mandays: number;
  project_id: number;
  exclude_mandays_id?: number;
};
