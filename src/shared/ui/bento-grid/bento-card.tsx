import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export interface BentoCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  /** Lebar kolom desktop (span-12, span-8, span-7, span-6, span-5, span-4, span-3). */
  colSpan?: 3 | 4 | 5 | 6 | 7 | 8 | 12;
}

const COL_SPAN_CLASSES: Record<number, string> = {
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  5: "lg:col-span-5 md:col-span-2",
  6: "lg:col-span-6 md:col-span-2",
  7: "lg:col-span-7 md:col-span-2",
  8: "lg:col-span-8 md:col-span-2",
  12: "lg:col-span-12 md:col-span-2",
};

/**
 * BentoCard — Komponen kartu modular bento box berestetika SaaS modern.
 * Memadukan surface token, border hairline, sudut rounded-xl, dan transisi halus.
 */
export function BentoCard({
  title,
  description,
  action,
  icon,
  badge,
  children,
  colSpan = 4,
  className,
  ...props
}: BentoCardProps) {
  const spanClass = COL_SPAN_CLASSES[colSpan] ?? "lg:col-span-4";

  return (
    <article
      data-slot="bento-card"
      className={cn(
        "group flex flex-col justify-between rounded-xl border border-border bg-surface p-5 sm:p-6",
        "transition-all duration-200 hover:border-brand/35 hover:shadow-xs",
        spanClass,
        className,
      )}
      {...props}
    >
      {(title || description || action || icon || badge) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            {icon && (
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-surface-subtle text-ink [&_svg]:size-4"
              >
                {icon}
              </span>
            )}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                {title && <h3 className="text-title-sm font-medium text-ink">{title}</h3>}
                {badge}
              </div>
              {description && (
                <p className="text-body-sm text-ink-muted line-clamp-2">{description}</p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}

      <div className="flex-1 flex flex-col">{children}</div>
    </article>
  );
}
