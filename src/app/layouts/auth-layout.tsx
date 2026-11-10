import { NavLink, Outlet } from "react-router";
import authVisual from "@/shared/assets/holographic-server-scan-alert.webp";
import trusteraLogo from "@/shared/assets/logo-trustera-red.png";
import trusteraMark from "@/shared/assets/logo-trustera-mark.png";

function BrandPanel() {
  return (
    <aside className="relative hidden min-h-0 overflow-hidden rounded-xs bg-surface-inverse min-[1301px]:block">
      <img
        src={authVisual}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover object-center"
      />
      <div className="gradient-photo-scrim absolute inset-0" aria-hidden="true" />
      <div
        aria-hidden="true"
        className="absolute inset-x-8 bottom-8 flex flex-col text-ink-inverse sm:inset-x-10 sm:bottom-10 xl:inset-x-12 xl:bottom-12"
      >
        <div className="flex flex-col font-sans uppercase leading-[0.82] tracking-[-0.04em]">
          <span className="text-7xl font-black tracking-[-0.05em] text-ink-inverse sm:text-8xl xl:text-[6.75rem] 2xl:text-[8.5rem]">
            VAPT
          </span>
          <span className="text-4xl font-light tracking-[-0.02em] text-ink-inverse/90 sm:text-5xl xl:text-[4.25rem] 2xl:text-[5.5rem]">
            MANAGEMENT
          </span>
        </div>
      </div>
    </aside>
  );
}

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-bg p-3 sm:p-4 min-[1301px]:grid min-[1301px]:grid-cols-[minmax(540px,0.96fr)_minmax(0,1.04fr)] min-[1301px]:gap-4 min-[1301px]:p-4">
      <h2 className="sr-only">VAPT Management</h2>

      <main className="flex min-h-[calc(100vh-1.5rem)] min-w-0 flex-col justify-between overflow-x-hidden px-1 py-4 sm:min-h-[calc(100vh-2rem)] sm:px-6 sm:py-6 min-[1301px]:px-8 min-[1301px]:py-6 2xl:px-12">
        {/* Desktop: Logo Trustera horizontal di luar card (pojok kiri atas) */}
        <NavLink to="/" className="hidden w-fit rounded-sm focus-ring min-[1301px]:block">
          <img
            src={trusteraLogo}
            alt="Trustera"
            width={1024}
            height={257}
            className="h-9 w-auto logo-adaptive"
          />
        </NavLink>

        <div className="flex flex-1 items-center justify-center py-4 sm:py-6 min-[1301px]:py-4">
          <div className="mx-auto flex w-full max-w-[440px] min-w-0 flex-col sm:max-w-[460px]">
            {/* Responsif (<= 1300px): Banner visual di atas card, di luar card */}
            <div className="relative mb-2 h-36 w-full overflow-hidden rounded-2xl bg-surface-inverse sm:h-44 md:h-48 min-[1301px]:hidden">
              <img
                src={authVisual}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 size-full object-cover object-center"
              />
              <div className="gradient-photo-scrim absolute inset-0" aria-hidden="true" />
              <div
                aria-hidden="true"
                className="absolute inset-x-5 bottom-4 flex flex-col font-sans uppercase leading-[0.84] tracking-[-0.04em] text-ink-inverse sm:inset-x-6 sm:bottom-5 md:inset-x-8 md:bottom-6"
              >
                <span className="text-3xl font-black tracking-[-0.05em] sm:text-4xl md:text-5xl">
                  VAPT
                </span>
                <span className="text-xl font-light tracking-[-0.02em] text-ink-inverse/90 sm:text-2xl md:text-3xl">
                  MANAGEMENT
                </span>
              </div>
            </div>

            {/* Responsif (<= 1300px): Logo Trustera masuk ke tengah di antara banner atas dan card */}
            <div className="relative z-10 -mt-10 mb-4 flex justify-center min-[1301px]:hidden">
              <NavLink
                to="/"
                aria-label="Kembali ke beranda"
                className="flex size-16 items-center justify-center rounded-full border-4 border-bg bg-surface p-2.5 shadow-raised transition-transform duration-150 ease-out focus-ring hover:scale-105 sm:size-20 sm:p-3"
              >
                <img
                  src={trusteraMark}
                  alt=""
                  aria-hidden="true"
                  className="size-full object-contain logo-adaptive"
                />
              </NavLink>
            </div>

            {/* Card Login */}
            <Outlet />
          </div>
        </div>

        <p className="pt-2 text-center text-caption text-ink-muted">
          &copy; 2026 Telkom. Seluruh hak cipta dilindungi.
        </p>
      </main>

      <BrandPanel />
    </div>
  );
}
