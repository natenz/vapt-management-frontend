import { useSearchParams } from "react-router";
import { useSession } from "@/entities/session";
import { PageHeader } from "@/shared/ui/page-header";
import { SegmentedTabsList, SegmentedTabsTrigger, Tabs, TabsContent } from "@/shared/ui/tabs";
import { CalendarTab } from "./calendar-tab";
import { HolidayTab } from "./holiday-tab";

const TABS = ["kalender", "libur"] as const;
type Tab = (typeof TABS)[number];

/** Kalender tim berbentuk Gantt dan daftar hari libur. */
export function CalendarPage() {
  const [sp, setSp] = useSearchParams();
  const raw = sp.get("tab");
  const tab: Tab = (TABS as readonly string[]).includes(raw ?? "") ? (raw as Tab) : "kalender";
  const user = useSession((s) => s.user);
  const role = user?.role?.role_name ?? "";
  const isAdmin = role === "super_admin" || role === "tech_lead";
  const isPentester = role === "pentester";

  const setTab = (next: string) =>
    setSp(
      () => {
        const p = new URLSearchParams();
        if (next !== "kalender") p.set("tab", next);
        return p;
      },
      { replace: true },
    );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kalender"
        description={
          isPentester
            ? "Jadwal penugasan kamu dan hari libur."
            : "Jadwal penugasan tim dan hari libur. Bentrok jadwal hanya jadi peringatan."
        }
      />
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-5">
        <SegmentedTabsList aria-label="Bagian kalender" className="self-start">
          <SegmentedTabsTrigger value="kalender">Kalender</SegmentedTabsTrigger>
          <SegmentedTabsTrigger value="libur">Hari libur</SegmentedTabsTrigger>
        </SegmentedTabsList>
        <TabsContent value="kalender" className="mt-0">
          <CalendarTab isPentester={isPentester} />
        </TabsContent>
        <TabsContent value="libur" className="mt-0">
          <HolidayTab canManage={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
