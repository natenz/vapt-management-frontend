/**
 * Stepper — *(derived)*
 *
 * Tidak ada di Design.md. Diturunkan dari aturan yang ADA:
 *
 *  - Status dibedakan BENTUK lebih dulu, warna belakangan: centang terisi
 *    (selesai), cincin (berjalan), lingkaran kosong (belum). Aturan yang sama
 *    dipakai `StatusIndicator` dan `Timeline`.
 *  - Centang kecil di dalam penanda sukses adalah satu-satunya ikon terisi yang
 *    diizinkan spec — persis kasus ini.
 *  - Penanda memakai `radius-full` seperti status dot, angka memakai tabular.
 *  - Nomor langkah bukan satu-satunya label: setiap langkah membawa katanya.
 *
 * Dua orientasi. Yang horizontal punya tujuh langkah, jadi ia menggulir
 * mendatar di layar sempit alih-alih memampat sampai tak terbaca.
 */
import { Check } from "lucide-react";
import { cn } from "@/shared/lib/cn";

type StepState = "done" | "current" | "todo";

type Step = {
  id: string;
  label: string;
  /** Baris kedua opsional, mis. tanggal selesai. */
  hint?: string;
};

const MARKER: Record<StepState, string> = {
  done: "border-surface-brand bg-surface-brand text-on-brand",
  current: "border-surface-brand border-2 bg-bg text-brand",
  todo: "border-border-strong bg-bg text-ink-muted",
};

const LABEL: Record<StepState, string> = {
  done: "text-ink",
  current: "text-ink",
  todo: "text-ink-muted",
};

function stateOf(index: number, currentIndex: number, allDone: boolean): StepState {
  if (allDone || index < currentIndex) return "done";
  if (index === currentIndex) return "current";
  return "todo";
}

function Marker({ state, index }: { state: StepState; index: number }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full border text-badge tabular",
        MARKER[state],
      )}
      aria-hidden
    >
      {state === "done" ? <Check className="size-4" /> : index + 1}
    </span>
  );
}

type StepperProps = {
  steps: readonly Step[];
  /** Indeks langkah yang sedang dikerjakan. */
  currentIndex: number;
  /** Semua langkah selesai — dipakai proyek yang sudah rampung. */
  allDone?: boolean;
  orientation?: "horizontal" | "vertical";
  className?: string;
};

function Stepper({
  steps,
  currentIndex,
  allDone = false,
  orientation = "horizontal",
  className,
}: StepperProps) {
  const done = steps.filter((_, i) => stateOf(i, currentIndex, allDone) === "done").length;

  if (orientation === "vertical") {
    return (
      <ol
        data-slot="stepper"
        aria-label={`Langkah ${done} dari ${steps.length} selesai`}
        className={cn("flex flex-col", className)}
      >
        {steps.map((step, i) => {
          const state = stateOf(i, currentIndex, allDone);
          const last = i === steps.length - 1;

          return (
            <li key={step.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <Marker state={state} index={i} />
                {last ? null : <span className="w-px flex-1 bg-border" />}
              </div>
              <div className={cn("min-w-0 flex-1 pt-1", last ? "pb-0" : "pb-6")}>
                <p className={cn("text-title-sm", LABEL[state])}>{step.label}</p>
                {step.hint ? <p className="text-caption text-ink-muted">{step.hint}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <ol
        data-slot="stepper"
        aria-label={`Langkah ${done} dari ${steps.length} selesai`}
        className="flex w-full min-w-[38rem] items-start"
      >
        {steps.map((step, i) => {
          const state = stateOf(i, currentIndex, allDone);
          const last = i === steps.length - 1;

          return (
            <li key={step.id} className={cn("flex items-start", last ? "shrink-0" : "min-w-0 flex-1")}>
              <div className="flex w-[4.75rem] shrink-0 flex-col items-center gap-2 text-center">
                <Marker state={state} index={i} />
                <span className={cn("text-caption leading-tight", LABEL[state])}>{step.label}</span>
                {step.hint ? <span className="text-caption text-ink-muted">{step.hint}</span> : null}
              </div>
              {last ? null : <span className="mx-1 mt-4 h-px min-w-2 flex-1 bg-border" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export { Stepper };
export type { Step, StepperProps, StepState };
