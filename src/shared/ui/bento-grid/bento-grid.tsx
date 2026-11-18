import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export interface BentoGridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * BentoGrid — Grid container 12-kolom responsif untuk tata letak Bento Box SaaS modern.
 * Pada mobile 1 kolom, tablet 2 kolom / 6-kolom, desktop 12-kolom.
 */
export function BentoGrid({ className, children, ...props }: BentoGridProps) {
  return (
    <div
      data-slot="bento-grid"
      className={cn("grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-12", className)}
      {...props}
    >
      {children}
    </div>
  );
}
