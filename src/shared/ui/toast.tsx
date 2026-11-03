/**
 * Toast — Design.md § Component Guidelines > Alert
 *
 * Spec tidak punya komponen toast, tapi punya aturan tegas tentang kapan
 * pesan boleh menghilang sendiri:
 *
 *   "Inline alerts persist until resolved; transient confirmations fade after
 *    6 seconds and are never errors."
 *   "One alert per event; stack at most three."
 *
 * Maka modul ini sengaja HANYA mengekspos `notify.success` dan `notify.info`.
 * Tidak ada `notify.error` — error adalah keadaan yang harus diselesaikan, jadi
 * tempatnya inline <Alert tone="error">, bukan toast yang kabur setelah 6
 * detik. Aturannya ditegakkan oleh permukaan API, bukan oleh catatan di dokumen.
 *
 * `toast` mentah milik sonner sengaja tidak di-reexport agar tidak ada jalan
 * pintas. Kalau suatu saat butuh varian baru, tambahkan di sini supaya
 * aturannya tetap satu pintu.
 */
import { Toaster as SonnerToaster, toast } from "sonner";
import { Alert } from "@/shared/ui/alert";

/** Spec: konfirmasi sesaat memudar setelah 6 detik. */
const TRANSIENT_DURATION_MS = 6000;

/** Spec: "stack at most three". */
const MAX_VISIBLE = 3;

type NotifyOptions = {
  /** Maksimal dua baris, mengikuti anatomi Alert. */
  description?: string;
};

function transient(tone: "success" | "info", title: string, options?: NotifyOptions) {
  return toast.custom(
    (id) => (
      <Alert
        tone={tone}
        title={title}
        onDismiss={() => toast.dismiss(id)}
        className="w-full shadow-raised"
      >
        {options?.description}
      </Alert>
    ),
    { duration: TRANSIENT_DURATION_MS },
  );
}

const notify = {
  /** Konfirmasi sesaat. Spec: "Success never celebrates with confetti or motion." */
  success: (title: string, options?: NotifyOptions) => transient("success", title, options),
  info: (title: string, options?: NotifyOptions) => transient("info", title, options),
  dismiss: toast.dismiss,
};

/**
 * Dipasang sekali di composition root.
 * Toast memakai anatomi Alert, jadi tema bawaan sonner dimatikan lewat
 * `unstyled` dan lebar diatur di sini.
 */
function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      visibleToasts={MAX_VISIBLE}
      toastOptions={{ unstyled: true, classNames: { toast: "w-[380px] max-w-[calc(100vw-2rem)]" } }}
    />
  );
}

export { Toaster, notify, TRANSIENT_DURATION_MS, MAX_VISIBLE };
export type { NotifyOptions };
