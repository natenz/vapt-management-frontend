import { ArrowRight, Clock, OctagonAlert, UsersRound } from "lucide-react";
import { Link } from "react-router";
import { RoleBadge, toUserProfileInfo, UserProfilePopover } from "@/entities/user";
import { MANDAYS_LIMIT, isOverLimit } from "@/shared/config/workload";
import { cn } from "@/shared/lib/cn";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { BentoCard } from "@/shared/ui/bento-grid";
import { Button } from "@/shared/ui/button";
import { CapacityGauge } from "@/shared/ui/charts";
import type { Capacity } from "../../model/superadmin-metrics";
import { CardEmpty, CardError, CardSkeleton } from "./card-states";

export function CapacityCard({
  data,
  isLoading,
  error,
}: {
  data: Capacity;
  isLoading: boolean;
  error: unknown;
}) {
  return (
    <BentoCard
      colSpan={4}
      role="region"
      aria-label="Kapasitas Tim"
      title="Kapasitas Pentester"
      description={`Bulan ini · batas ${MANDAYS_LIMIT} MD per orang.`}
      icon={<Clock />}
      action={
        <Button asChild variant="link" trailingIcon={<ArrowRight />} className="h-auto p-0 text-xs">
          <Link to="/resources">Resource</Link>
        </Button>
      }
    >
      {error ? (
        <CardError title="Beban mandays belum bisa dihitung" error={error} />
      ) : isLoading ? (
        <CardSkeleton rows={5} />
      ) : (
        <div className="flex flex-col gap-3">
          <CapacityGauge
            current={Math.round(data.used)}
            limit={data.limit}
            label="Total alokasi"
            unit="MD"
            subtext={
              data.overloaded.length > 0
                ? `${data.overloaded.length} pentester melewati batas`
                : "Tidak ada pentester melewati batas"
            }
          />
          {data.overloaded.length > 0 ? (
            <div className="flex items-start gap-2 rounded-sm bg-error-bg p-2.5 text-xs text-error">
              <OctagonAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>Perlu redistribusi penugasan agar beban kembali di bawah {MANDAYS_LIMIT} MD.</span>
            </div>
          ) : null}
          {data.ranking.length === 0 ? (
            <CardEmpty>Belum ada pentester terdaftar.</CardEmpty>
          ) : (
            <ul className="flex max-h-52 flex-col divide-y divide-border overflow-y-auto">
              {data.ranking.slice(0, 6).map(({ user, mandays }) => {
                const info = toUserProfileInfo(user);
                const over = isOverLimit(mandays);
                return (
                  <li key={user.sys_user_id} className="flex items-center justify-between gap-2 py-2">
                    <UserProfilePopover user={info}>
                      <button
                        type="button"
                        className="flex min-w-0 items-center gap-2 rounded-xs text-left focus-ring"
                      >
                        <Avatar size="sm" className="shrink-0">
                          <AvatarFallback>{info.initials}</AvatarFallback>
                        </Avatar>
                        <span className="truncate text-xs text-ink">{info.name}</span>
                      </button>
                    </UserProfilePopover>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-xs px-2 py-0.5 text-xs tabular-nums",
                        over ? "bg-error-bg text-error" : "bg-surface-subtle text-ink-secondary",
                      )}
                    >
                      {over ? <OctagonAlert className="size-3" aria-hidden /> : null}
                      {mandays} MD
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </BentoCard>
  );
}

export function RoleCompositionCard({
  rows,
  total,
  isLoading,
  error,
}: {
  rows: { role: string; count: number }[];
  total: number;
  isLoading: boolean;
  error: unknown;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <BentoCard
      colSpan={4}
      role="region"
      aria-label="Komposisi Pengguna"
      title="Komposisi Pengguna"
      description={`${total} akun terdaftar di sistem.`}
      icon={<UsersRound />}
      action={
        <Button asChild variant="link" trailingIcon={<ArrowRight />} className="h-auto p-0 text-xs">
          <Link to="/users">Kelola</Link>
        </Button>
      }
    >
      {error ? (
        <CardError title="Gagal memuat pengguna" error={error} />
      ) : isLoading ? (
        <CardSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <CardEmpty>Belum ada pengguna.</CardEmpty>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.role} className="flex flex-col gap-1.5">
              <span className="flex items-center justify-between gap-2">
                <RoleBadge role={r.role} />
                <span className="text-xs text-ink tabular-nums">{r.count}</span>
              </span>
              <span className="h-1.5 overflow-hidden rounded-full bg-surface-subtle" aria-hidden>
                <span
                  className="block h-full rounded-full bg-ink-muted"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </BentoCard>
  );
}
