import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BookCheck, Check, Eye, ShieldAlert, UserRound, Wrench, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { reviewCatalog, type CatalogVulna } from "@/entities/catalog";
import { SeverityChip } from "@/entities/finding";
import { toUserProfileInfo, UserProfilePopover } from "@/entities/user";
import { toSeverityKey } from "@/shared/lib/format";
import { BentoCard } from "@/shared/ui/bento-grid";
import { Button } from "@/shared/ui/button";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { notify } from "@/shared/ui/toast";
import { severityCounts } from "../../model/techlead-metrics";
import { CardSkeleton, ColumnLabel } from "../superadmin/card-states";

export function CatalogReviewCard({
  queue,
  approvedCount,
  isLoading,
}: {
  queue: readonly CatalogVulna[];
  approvedCount: number | null;
  isLoading: boolean;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<CatalogVulna | null>(null);
  const review = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "approved" | "rejected" }) => reviewCatalog(id, status),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
      notify.success(
        vars.status === "approved"
          ? "Usulan kerentanan disetujui dan masuk ke katalog standar"
          : "Usulan kerentanan telah ditolak",
      );
      if (selected?.vulna_id === vars.id) setSelected(null);
    },
  });
  const decide = (id: number, status: "approved" | "rejected") => review.mutate({ id, status });
  const counts = severityCounts(queue);

  return (
    <BentoCard
      colSpan={12}
      role="region"
      aria-label="Persetujuan Usulan Katalog Kerentanan"
      title="Persetujuan Usulan Katalog Kerentanan"
      description={`Validasi usulan pentester sebelum masuk standar katalog${
        approvedCount !== null ? ` · ${approvedCount} kerentanan sudah baku` : ""
      }.`}
      icon={<BookCheck />}
      action={
        <Button asChild variant="link" trailingIcon={<ArrowRight />} className="h-auto p-0 text-xs">
          <Link to="/catalog">Kelola katalog</Link>
        </Button>
      }
    >
      {isLoading ? (
        <CardSkeleton rows={4} />
      ) : queue.length === 0 ? (
        <EmptyState
          icon={<BookCheck />}
          title="Tidak ada usulan kerentanan pending"
          description="Semua usulan dari tim pentester sudah ditinjau."
          action={
            <Button asChild variant="outline">
              <Link to="/catalog">Kelola Standar Katalog</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-wrap items-center gap-3" aria-label="Sebaran severity usulan">
            {Object.entries(counts)
              .filter(([, n]) => n > 0)
              .map(([sev, n]) => (
                <li key={sev} className="inline-flex items-center gap-1.5">
                  <SeverityChip severity={toSeverityKey(sev)} />
                  <span className="text-xs text-ink-muted tabular-nums">×{n}</span>
                </li>
              ))}
          </ul>
          <div className="overflow-x-auto">
            <Table boxed>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <ColumnLabel icon={<ShieldAlert />}>Kerentanan</ColumnLabel>
                  </TableHead>
                  <TableHead>
                    <ColumnLabel icon={<ShieldAlert />}>Severity</ColumnLabel>
                  </TableHead>
                  <TableHead>
                    <ColumnLabel icon={<UserRound />}>Pengusul</ColumnLabel>
                  </TableHead>
                  <TableHead>
                    <ColumnLabel icon={<Wrench />}>Rekomendasi</ColumnLabel>
                  </TableHead>
                  <TableHead numeric>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.map((item) => {
                  const creator = toUserProfileInfo(item.creator, "Pentester");
                  const busy = review.isPending && review.variables?.id === item.vulna_id;
                  return (
                    <TableRow key={item.vulna_id}>
                      <TableCell>
                        <span className="flex flex-col">
                          <span className="text-title-sm font-normal text-ink">{item.title}</span>
                          {item.cvss_score ? (
                            <span className="text-caption text-ink-muted">CVSS {item.cvss_score}</span>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell>
                        <SeverityChip severity={toSeverityKey(item.severity)} />
                      </TableCell>
                      <TableCell>
                        <UserProfilePopover user={creator}>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-xs text-left text-xs text-ink-secondary focus-ring hover:text-ink"
                          >
                            <Avatar size="sm" className="shrink-0">
                              <AvatarFallback>{creator.initials}</AvatarFallback>
                            </Avatar>
                            <span>{creator.name}</span>
                          </button>
                        </UserProfilePopover>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <span className="line-clamp-2 text-xs text-ink-secondary">
                          {item.remediation_recommendation || item.description || "-"}
                        </span>
                      </TableCell>
                      <TableCell numeric>
                        <span className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="quiet"
                            leadingIcon={<Eye />}
                            onClick={() => setSelected(item)}
                            className="h-8 px-2.5 text-xs"
                          >
                            Tinjau
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            leadingIcon={<Check />}
                            disabled={busy}
                            onClick={() => decide(item.vulna_id, "approved")}
                            className="h-8 px-2.5 text-xs text-success"
                          >
                            Setujui
                          </Button>
                          <Button
                            type="button"
                            variant="quiet"
                            leadingIcon={<X />}
                            disabled={busy}
                            onClick={() => decide(item.vulna_id, "rejected")}
                            className="h-8 px-2.5 text-xs text-error hover:bg-error-bg"
                          >
                            Tolak
                          </Button>
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>{selected?.title}</DialogTitle>
              {selected?.severity ? <SeverityChip severity={toSeverityKey(selected.severity)} /> : null}
            </div>
            <DialogDescription>
              Diajukan oleh{" "}
              <strong>
                {selected?.creator?.profile?.full_name ?? selected?.creator?.username ?? "Pentester"}
              </strong>
              {selected?.cvss_score ? ` · Skor CVSS: ${selected.cvss_score}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2 text-sm text-ink">
            {selected?.description ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-ink-muted">Deskripsi Kerentanan</span>
                <p className="rounded-xs bg-surface-subtle p-3 text-xs leading-relaxed whitespace-pre-wrap">
                  {selected.description}
                </p>
              </div>
            ) : null}
            {selected?.remediation_recommendation ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-ink-muted">Rekomendasi Remediasi</span>
                <p className="rounded-xs bg-surface-subtle p-3 text-xs leading-relaxed whitespace-pre-wrap">
                  {selected.remediation_recommendation}
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="quiet">
                Tutup
              </Button>
            </DialogClose>
            {selected ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  leadingIcon={<X />}
                  disabled={review.isPending}
                  onClick={() => decide(selected.vulna_id, "rejected")}
                  className="text-error hover:bg-error-bg"
                >
                  Tolak Usulan
                </Button>
                <Button
                  type="button"
                  variant="solid"
                  leadingIcon={<Check />}
                  disabled={review.isPending}
                  onClick={() => decide(selected.vulna_id, "approved")}
                >
                  Setujui Sekarang
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BentoCard>
  );
}
