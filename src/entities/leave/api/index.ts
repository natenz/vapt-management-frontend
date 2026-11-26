import { z } from "zod";
import { apiRequest } from "@/shared/api";
import {
  holidayCreatedSchema,
  holidaySchema,
  leaveSchema,
  type LeaveInput,
  type LeaveQuery,
} from "../model/types";

export const listLeaves = async (q: LeaveQuery = {}) =>
  (await apiRequest("/leaves", { method: "GET", query: q }, z.array(leaveSchema))).data;

export const createLeave = async (body: LeaveInput) =>
  (await apiRequest("/leaves", { method: "POST", body }, leaveSchema)).data;

export const updateLeave = async (id: number, body: Partial<Omit<LeaveInput, "sys_user_id">>) =>
  (await apiRequest(`/leaves/${id}`, { method: "PUT", body }, leaveSchema)).data;

export const deleteLeave = async (id: number) =>
  (await apiRequest(`/leaves/${id}`, { method: "DELETE" }, z.unknown())).data;

/** Tech Lead/Superadmin menyetujui atau menolak; `note` wajib saat menolak. */
export const reviewLeave = async (id: number, status: "approved" | "rejected", note?: string) =>
  (await apiRequest(`/leaves/${id}/review`, { method: "PATCH", body: { status, note } }, leaveSchema)).data;

export const listHolidays = async (year?: number) =>
  (await apiRequest("/holidays", { method: "GET", query: { year } }, z.array(holidaySchema))).data;

export const createHoliday = async (body: { date: string; name: string }) =>
  (await apiRequest("/holidays", { method: "POST", body }, holidayCreatedSchema)).data;

export const deleteHoliday = async (id: number) =>
  (await apiRequest(`/holidays/${id}`, { method: "DELETE" }, z.unknown())).data;
