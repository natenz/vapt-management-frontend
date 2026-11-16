import { Circle } from "lucide-react";
import { StatusBadge } from "@/shared/ui/badge";

type Tone = "info" | "success" | "warning" | "error" | "neutral";
const TONE: Record<string, Tone> = {
  Draft: "neutral",
  Planning: "info",
  Scoping: "info",
  Assessment: "warning",
  Analysis: "warning",
  "Initial Report": "info",
  Remediasi: "warning",
  Retesting: "warning",
  "Final Report Drafting": "info",
  "Final Presentation": "info",
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
