import { Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { downloadReportDocx } from "@/entities/finding";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";

type PreviewSource = {
  projectId: number;
  assetId?: number;
};

function ReportPreviewDocument({ projectId, assetId }: PreviewSource) {
  const [preview, setPreview] = useState<{ html: string } | { error: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function loadPreview() {
      try {
        const [file, { renderAsync }] = await Promise.all([
          downloadReportDocx(projectId, assetId, signal),
          import("docx-preview"),
        ]);
        if (signal.aborted) return;

        const container = document.createElement("div");
        await renderAsync(file, container, undefined, {
          renderAltChunks: false,
          useBase64URL: true,
          ignoreLastRenderedPageBreak: false,
        });
        if (signal.aborted) return;

        // Tautan menuju bagian lain di dokumen tetap bisa digunakan.
        for (const link of container.querySelectorAll("a[href]")) {
          if (!link.getAttribute("href")?.startsWith("#")) link.removeAttribute("href");
        }
        setPreview({
          html: `<!doctype html><html lang="id"><head><meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'">
            <style>body { margin: 0; }</style></head><body>${container.innerHTML}</body></html>`,
        });
      } catch (cause) {
        if (signal.aborted) return;
        setPreview({
          error: cause instanceof Error ? cause.message : "Pratinjau report tidak dapat dimuat.",
        });
      }
    }

    void loadPreview();
    return () => controller.abort();
  }, [projectId, assetId]);

  if (!preview) {
    return <p role="status" className="px-4 py-8 text-body-sm text-ink-muted">Memuat pratinjau DOCX…</p>;
  }
  if ("error" in preview) {
    return <Alert tone="error" title="Pratinjau report gagal">{preview.error}</Alert>;
  }
  return (
    <iframe
      title="Dokumen report"
      sandbox=""
      srcDoc={preview.html}
      className="h-[65dvh] w-full rounded-sm border border-border bg-surface"
    />
  );
}

export function ReportPreview({ projectId, assetId, name }: PreviewSource & { name: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" leadingIcon={<Eye />}>
          {assetId === undefined ? "Pratinjau report" : "Pratinjau report asset"}
        </Button>
      </DialogTrigger>
      <DialogContent size="lg" className="max-h-[90dvh] max-w-5xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="mb-4 min-w-0">
          <DialogTitle>Pratinjau report</DialogTitle>
          <DialogDescription className="wrap-break-word">{name}</DialogDescription>
        </DialogHeader>
        <ReportPreviewDocument key={`${projectId}/${assetId ?? "project"}`} projectId={projectId} assetId={assetId} />
      </DialogContent>
    </Dialog>
  );
}
