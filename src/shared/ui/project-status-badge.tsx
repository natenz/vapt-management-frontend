import { Circle } from "lucide-react";
import { StatusBadge } from "@/shared/ui/badge";

type Tone = "info" | "success" | "warning" | "error" | "neutral";
const TONE: Record<string, Tone> = {
  Draft: "neutral",
  Planning: "info",
  Pentest: "warning",
  Reporting: "info",
  Remediation: "warning",
  Retest: "warning",
  Done: "success",
};

export function ProjectStatusBadge({ name }: { name?: string | null }) {
  const label = name ?? "-";
  return (
    <StatusBadge tone={TONE[label] ?? "neutral"} icon={<Circle className="fill-current" aria-hidden />}>
      {label}
    </StatusBadge>
  );
}
