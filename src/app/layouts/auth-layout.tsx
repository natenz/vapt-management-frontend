import { ShieldCheck } from "lucide-react";
import { Outlet } from "react-router";

export function AuthLayout() {
  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 lg:px-12">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-sm bg-surface-brand text-on-brand">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <span className="text-title-md text-ink">VAPT Management</span>
        </div>
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">
          <Outlet />
        </div>
      </div>
      <aside
        aria-hidden
        className="relative m-4 hidden flex-col justify-end overflow-hidden rounded-xl gradient-auth-panel p-12 text-ink-inverse lg:flex"
      >
        <ul className="mb-8 flex gap-3">
          {["Assess", "Validate", "Report"].map((t) => (
            <li
              key={t}
              className="rounded-full bg-ink-inverse/15 px-4 py-1.5 text-badge text-ink-inverse backdrop-blur-sm"
            >
              {t}
            </li>
          ))}
        </ul>
        <p className="text-heading-1 max-w-md text-ink-inverse">Satu tempat untuk seluruh temuan keamanan.</p>
        <p className="mt-3 max-w-md text-body-sm text-ink-inverse-muted">
          Dari template proyek sampai laporan akhir, tiap temuan tercatat, ditugaskan, dan bisa dilacak sampai tuntas.
        </p>
      </aside>
    </div>
  );
}
