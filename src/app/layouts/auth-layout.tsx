import { NavLink, Outlet } from "react-router";
import authVisual from "@/shared/assets/holographic-server-scan-alert.webp";
import trusteraLogo from "@/shared/assets/logo-trustera-red.png";

function BrandPanel() {
  return (
    <aside className="relative hidden min-h-0 overflow-hidden rounded-xl bg-surface-inverse lg:block">
      <img
        src={authVisual}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover object-center"
      />
      <div className="gradient-photo-scrim absolute inset-0" aria-hidden="true" />
      <div
        aria-hidden="true"
        className="absolute bottom-10 left-10 w-[min(80%,28rem)] text-ink-inverse xl:bottom-12 xl:left-12"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="h-px w-14 bg-red-300" />
          <span className="size-1.5 rounded-full bg-red-300" />
        </div>

        <div className="flex flex-col gap-5">
          <p>
            <span className="mb-2 inline-flex items-center gap-2 rounded-xs bg-on-brand px-3 py-1 text-badge font-semibold tracking-[0.12em] text-red-800 uppercase shadow-raised">
              <span className="text-red-600">01</span>
              Assess
            </span>
            <span className="block text-heading-1 font-normal tracking-[-0.02em] xl:text-display">
              your security.
            </span>
          </p>
          <p>
            <span className="mb-2 inline-flex items-center gap-2 rounded-xs bg-on-brand px-3 py-1 text-badge font-semibold tracking-[0.12em] text-red-800 uppercase shadow-raised">
              <span className="text-red-600">02</span>
              Validate
            </span>
            <span className="block text-heading-1 font-semibold tracking-[-0.02em] xl:text-display">
              your defenses.
            </span>
          </p>
        </div>
      </div>
    </aside>
  );
}

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-surface p-3 sm:p-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(520px,0.98fr)] lg:gap-4 lg:p-4 xl:grid-cols-[minmax(540px,0.96fr)_minmax(0,1.04fr)]">
      <h2 className="sr-only">Assess your security. Validate your defenses.</h2>

      <main className="flex min-h-[calc(100vh-1.5rem)] min-w-0 flex-col overflow-x-hidden px-1 py-2 sm:min-h-[calc(100vh-2rem)] sm:px-6 sm:py-4 lg:px-8 lg:py-3 xl:px-12">
        <NavLink to="/" className="w-fit rounded-sm focus-ring">
          <img
            src={trusteraLogo}
            alt="Trustera"
            width={1024}
            height={257}
            className="h-9 w-auto logo-adaptive"
          />
        </NavLink>

        <div className="flex flex-1 items-center py-10 sm:py-12 lg:py-8">
          <div className="mx-auto flex w-full max-w-[420px] min-w-0 flex-col">
            <Outlet />
          </div>
        </div>

        <p className="text-center text-caption text-ink-muted">
          &copy; 2026 Telkom. Seluruh hak cipta dilindungi.
        </p>
      </main>

      <BrandPanel />
    </div>
  );
}
