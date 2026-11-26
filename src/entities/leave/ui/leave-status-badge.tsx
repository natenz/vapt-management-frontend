import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { StatusChip } from "@/shared/ui/badge";
import { LEAVE_STATUS_LABEL, type LeaveStatus } from "../model/types";

const META: Record<LeaveStatus, { tone: "warning" | "success" | "error"; icon: React.ReactNode }> = {
  pending: { tone: "warning", icon: <Clock /> },
  approved: { tone: "success", icon: <CheckCircle2 /> },
  rejected: { tone: "error", icon: <XCircle /> },
};

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  return (
    <StatusChip tone={META[status].tone} icon={META[status].icon}>
      {LEAVE_STATUS_LABEL[status]}
    </StatusChip>
  );
}
