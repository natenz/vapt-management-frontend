import { ArrowRight, Clock, UsersRound } from "lucide-react";
import { Link } from "react-router";
import { RoleBadge, toUserProfileInfo, UserProfilePopover } from "@/entities/user";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { BentoCard } from "@/shared/ui/bento-grid";
import { Button } from "@/shared/ui/button";
import type { TeamMandays } from "../../model/superadmin-metrics";
import { CardEmpty, CardError, CardSkeleton } from "./card-states";

export function PentesterMandaysCard({
  data,
  isLoading,
  error,
}: {
  data: TeamMandays;
  isLoading: boolean;
  error: unknown;
}) {
  return (
    <BentoCard
      colSpan={4}
      role="region"
      aria-label="Mandays Pentester"
      title="Mandays Pentester"
      description={`Bulan ini · ${data.used} MD ditugaskan ke ${data.assigned} dari ${data.pentesters} pentester.`}
      icon={<Clock />}
      action={
        <Button asChild variant="link" trailingIcon={<ArrowRight />} className="h-auto p-0 text-xs">
          <Link to="/resources">Resource</Link>
        </Button>
      }
    >
      {error ? (
        <CardError title="Mandays belum bisa dihitung" error={error} />
      ) : isLoading ? (
        <CardSkeleton rows={5} />
      ) : data.ranking.length === 0 ? (
        <CardEmpty>Belum ada pentester terdaftar.</CardEmpty>
      ) : (
        <ul className="flex max-h-64 flex-col divide-y divide-border overflow-y-auto">
          {data.ranking.map(({ user, mandays }) => {
            const info = toUserProfileInfo(user);
            return (
              <li key={user.sys_user_id} className="flex items-center justify-between gap-2 py-2">
                <UserProfilePopover user={info}>
                  <button type="button" className="flex min-w-0 items-center gap-2 rounded-xs text-left focus-ring">
                    <Avatar size="sm" className="shrink-0">
                      <AvatarFallback>{info.initials}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-xs text-ink">{info.name}</span>
                  </button>
                </UserProfilePopover>
                <span className="inline-flex shrink-0 rounded-xs bg-surface-subtle px-2 py-0.5 text-xs text-ink-secondary tabular-nums">
                  {mandays} MD
                </span>
              </li>
            );
          })}
        </ul>
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
