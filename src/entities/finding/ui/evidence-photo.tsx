import { useEffect, useState } from "react";
import type { Evidence } from "../model/types";
import { getEvidencePhoto } from "../api";

/** Foto diambil dengan autentikasi; URL sementara dilepas saat komponen ditutup. */
export function EvidencePhoto({ evidence }: { evidence: Evidence }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setUrl("");
    setFailed(false);
    void getEvidencePhoto(evidence.evidence_id).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [evidence.evidence_id]);
  if (failed) return <p className="text-caption text-error">Foto {evidence.file_name} gagal dimuat.</p>;
  if (!url) return <p className="text-caption text-ink-muted">Memuat foto…</p>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex w-36 flex-col gap-1 rounded-sm border border-border p-2 focus-ring" aria-label={`Lihat evidence ${evidence.file_name}`}>
      <img src={url} alt={evidence.file_name} className="h-24 w-full rounded-xs object-contain" />
      <span className="truncate text-caption text-ink-secondary">{evidence.file_name}</span>
    </a>
  );
}
