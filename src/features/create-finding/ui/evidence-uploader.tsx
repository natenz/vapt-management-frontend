import { ImagePlus, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Field } from "@/shared/ui/input";

type EvidenceUploaderProps = {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
};

function fileSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`;
}

export function EvidenceUploader({ files, onChange, disabled = false }: EvidenceUploaderProps) {
  const input = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);

  useEffect(() => {
    const next = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPreviews(next);
    return () => next.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [files]);

  function addFiles(selected: File[]) {
    if (disabled) return;
    if (files.length + selected.length > 5) { setError("Maksimal 5 foto. Hapus salah satu foto untuk menggantinya."); return; }
    if (selected.some((file) => !["image/png", "image/jpeg"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setError("Gunakan foto PNG/JPEG maksimal 5 MB per foto."); return;
    }
    setError("");
    onChange([...files, ...selected]);
  }

  return (
    <Field label="Foto evidence" labelMeta="Opsional" error={error || undefined}>
      {(field) => (
        <div className="flex min-w-0 flex-col gap-3">
          <input {...field} ref={input} type="file" className="sr-only" tabIndex={-1} accept="image/png,image/jpeg" multiple disabled={disabled}
            onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
          <div role="group" aria-label="Unggah foto evidence" aria-disabled={disabled || undefined}
            className={cn(
              "flex flex-col items-center gap-3 rounded-sm border border-dashed border-border-control bg-surface-subtle p-5 text-center transition-colors duration-150 motion-reduce:transition-none sm:flex-row sm:gap-4 sm:text-left",
              !disabled && "hover:border-brand hover:bg-brand-tint/30",
              dragging && !disabled && "border-brand bg-brand-tint/30",
              error && "border-error",
              disabled && "cursor-not-allowed opacity-60",
            )}
            onDragEnter={(event) => { event.preventDefault(); if (!disabled) { dragDepth.current += 1; setDragging(true); } }}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = disabled ? "none" : "copy"; }}
            onDragLeave={(event) => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDragging(false); }}
            onDrop={(event) => { event.preventDefault(); dragDepth.current = 0; setDragging(false); addFiles(Array.from(event.dataTransfer.files)); }}>
            <ImagePlus className="size-6 shrink-0 text-ink-secondary" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-button text-ink">{dragging ? "Lepaskan foto di sini" : "Seret foto ke sini"}</p>
              <p className="mt-1 text-caption text-ink-muted">PNG atau JPEG · Maks. 5 MB per foto</p>
            </div>
            <Button type="button" variant="outline" disabled={disabled || files.length >= 5} leadingIcon={<Upload />} onClick={() => input.current?.click()} aria-describedby={field["aria-describedby"]}>
              {files.length > 0 ? "Tambah foto" : "Pilih foto"}
            </Button>
          </div>
          <p className="text-caption text-ink-muted" aria-live="polite">{files.length > 0 ? `${files.length} dari 5 foto` : "Maksimal 5 foto untuk setiap finding."}</p>
          {previews.length > 0 ? (
            <ul className="divide-y divide-border" aria-label="Foto yang akan diunggah">
              {previews.map(({ file, url }, index) => (
                <li key={`${file.name}-${index}`} className="flex min-w-0 items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <img src={url} alt={`Pratinjau ${file.name}`} className="size-14 shrink-0 rounded-xs border border-border bg-surface-subtle object-contain" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm text-ink" title={file.name}>{file.name}</p>
                    <p className="mt-1 text-caption text-ink-muted tabular-nums">{fileSize(file.size)}</p>
                  </div>
                  <Button type="button" variant="quiet" className="w-10 px-0" disabled={disabled} aria-label={`Hapus foto ${file.name}`}
                    onClick={() => { setError(""); onChange(files.filter((_, i) => i !== index)); }}>
                    <X aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </Field>
  );
}
