/**
 * Spinner — Design.md § 8 Interaction Language > Loading
 *
 * "Buttons keep their width and replace the trailing icon with a 16px spinner."
 *
 * Dibuat dari ikon Lucide `loader-circle` supaya konsisten dengan famili ikon
 * sistem (outline, round cap). Di bawah prefers-reduced-motion, animasi
 * dimatikan oleh base layer.
 */
import { LoaderCircle } from "lucide-react";
import { cn } from "@/shared/lib/cn";

function Spinner({ className, label = "Memuat" }: { className?: string; label?: string }) {
  return (
    <LoaderCircle
      role="status"
      aria-label={label}
      className={cn("size-4 animate-spin", className)}
    />
  );
}

export { Spinner };
