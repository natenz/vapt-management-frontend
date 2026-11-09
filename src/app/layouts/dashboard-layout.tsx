import { Outlet } from "react-router";
import { AppHeader } from "@/widgets/app-header";
import { AppSidebar } from "@/widgets/app-sidebar";

export function DashboardLayout() {
  return (
    <div className="fixed inset-0 flex overflow-hidden bg-bg">
      <AppSidebar />
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-8 lg:px-6">
          <div className="mx-auto max-w-wide">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
