import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { updateProjectStages, type ProjectDetail } from "@/entities/project";
import { fmtRange } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Gantt, type GanttItem } from "@/shared/ui/gantt";
import { TabChip, Tabs, TabsContent, TabsList } from "@/shared/ui/tabs";
import { notify } from "@/shared/ui/toast";
import { buildStageSchedule, mandaysState } from "../model/gantt-state";

export function ProjectGanttSection({ project, canEdit = false }: { project: ProjectDetail; canEdit?: boolean }) {
  const qc = useQueryClient();
  const current = project.status?.status_name ?? "";
  const serverStages = useMemo(() => buildStageSchedule(project), [project]);
  const [drafts, setDrafts] = useState(serverStages);

  useEffect(() => {
    setDrafts(serverStages);
  }, [serverStages]);

  const hasPersistedStages = drafts.length > 0 && drafts.every((s) => s.stageId != null);
  const editable = canEdit && hasPersistedStages;
  const dirty = useMemo(
    () =>
      drafts.length === serverStages.length &&
      drafts.some((s, i) => s.startsAt !== serverStages[i]?.startsAt || s.endsAt !== serverStages[i]?.endsAt),
    [drafts, serverStages],
  );

  const save = useMutation({
    mutationFn: () =>
      updateProjectStages(
        project.project_id,
        drafts.map((s) => ({
          stage_id: s.stageId!,
          owner: s.owner,
          start_date: s.startsAt,
          end_date: s.endsAt,
        })),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["project", project.project_id] });
      notify.success("Jadwal 8 tahap tersimpan");
    },
  });

  const stageById = new Map(drafts.map((s) => [s.id, s]));
  const stageItems: GanttItem[] = drafts.map((s) => ({
    id: s.id,
    label: s.label,
    owner: s.owner,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    state: s.state,
  }));

  const mandaysItems: GanttItem[] = project.mandays
    .filter((m) => m.start_date && m.end_date)
    .map((m) => ({
      id: String(m.mandays_id),
      label: `${m.asset?.asset_name ?? `Aset ${m.asset_id}`} · ${m.pentester?.profile?.full_name ?? m.pentester?.username ?? "-"}`,
      startsAt: m.start_date as string,
      endsAt: m.end_date as string,
      state: mandaysState(m, current),
    }));

  if (stageItems.length === 0 && mandaysItems.length === 0) return null;

  const rangeStart = project.start_date?.slice(0, 10);
  const rangeEnd = project.end_date?.slice(0, 10);
  const handleStageChange = (itemId: string, startsAt: string, endsAt: string) => {
    setDrafts((prev) => prev.map((s) => (s.id === itemId ? { ...s, startsAt, endsAt } : s)));
  };

  const renderStageDetail = (item: GanttItem) => {
    const detail = stageById.get(item.id);
    return (
      <div className="flex flex-col gap-1 text-body-sm">
        <span className="font-medium text-ink">{item.label}</span>
        <span className="text-caption text-ink-secondary">Owner: {item.owner ?? "-"}</span>
        <span className="text-caption text-ink-muted">{fmtRange(item.startsAt, item.endsAt)}</span>
        <span className="text-caption text-ink-muted">
          {detail?.source === "server"
            ? "Tersimpan di backend"
            : detail?.source === "mandays"
              ? "Sumber: jadwal trx_mandays"
              : "Estimasi dari periode proyek"}
        </span>
      </div>
    );
  };

  const stageGantt = (
    <div className="flex flex-col gap-3">
      {save.error ? (
        <Alert tone="error" title="Gagal menyimpan jadwal tahap" compact>
          {save.error.message}
        </Alert>
      ) : null}
      <Gantt
        items={stageItems}
        initialMonth={stageItems[0] ? new Date(stageItems[0].startsAt) : undefined}
        editable={editable}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onItemChange={handleStageChange}
        renderDetail={renderStageDetail}
      />
    </div>
  );

  return (
    <section aria-labelledby="timeline" className="flex flex-col gap-4 rounded-md border border-border bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="timeline" className="text-title-md text-ink">Timeline pengujian</h2>
          <p className="mt-1 text-caption text-ink-muted">
            {editable
              ? "Jadwal 8 tahap pelaksanaan proyek. Geser atau ubah durasi batang lalu klik Simpan jadwal."
              : "Jadwal 8 tahap pelaksanaan proyek beserta penanggung jawab (Owner)."}
          </p>
        </div>
        {editable ? (
          <span className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!dirty || save.isPending}
              onClick={() => {
                setDrafts(serverStages);
                save.reset();
              }}
            >
              Batalkan
            </Button>
            <Button
              type="button"
              variant="solid"
              loading={save.isPending}
              disabled={!dirty}
              onClick={() => save.mutate()}
            >
              Simpan jadwal
            </Button>
          </span>
        ) : null}
      </div>

      {stageItems.length > 0 && mandaysItems.length > 0 ? (
        <Tabs defaultValue="stages" className="flex flex-col">
          <TabsList aria-label="Tampilan timeline">
            <TabChip value="stages" count={stageItems.length}>Tahapan proyek</TabChip>
            <TabChip value="assets" count={mandaysItems.length}>Penugasan aset</TabChip>
          </TabsList>
          <TabsContent value="stages">{stageGantt}</TabsContent>
          <TabsContent value="assets">
            <Gantt
              items={mandaysItems}
              initialMonth={mandaysItems[0] ? new Date(mandaysItems[0].startsAt) : undefined}
            />
          </TabsContent>
        </Tabs>
      ) : stageItems.length > 0 ? (
        stageGantt
      ) : (
        <Gantt
          items={mandaysItems}
          initialMonth={mandaysItems[0] ? new Date(mandaysItems[0].startsAt) : undefined}
        />
      )}
    </section>
  );
}
