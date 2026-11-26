import {
  holidayCreatedSchema,
  holidaySchema,
  LEAVE_STATUSES,
  leaveSchema,
  type Holiday,
  type HolidayCreated,
  type Leave,
  type LeaveConflict,
  type LeaveStatus,
} from "@/shared/api/schemas";

export { holidayCreatedSchema, holidaySchema, LEAVE_STATUSES, leaveSchema };
export type { Holiday, HolidayCreated, Leave, LeaveConflict, LeaveStatus };

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
};

export type LeaveInput = {
  /** Wajib untuk Tech Lead/Superadmin; pentester selalu untuk dirinya sendiri. */
  sys_user_id?: number;
  start_date: string;
  end_date: string;
  reason?: string;
};

export type LeaveQuery = { from?: string; to?: string; user_id?: number; status?: LeaveStatus };
