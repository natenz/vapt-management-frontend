import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { useState } from "react";
import { fmtDate } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Field, Input } from "@/shared/ui/input";
import { Alert } from "@/shared/ui/alert";

export function HolidayEditor({ value, onChange, min, max, disabled }: {
  value: string[]; onChange: (value: string[]) => void; min?: string; max?: string; disabled: boolean;
}) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const add = () => {
    const last = end || start;
    if (!start || last < start || (min && start < min) || (max && last > max)) {
      setError("Pilih rentang libur yang valid di dalam periode proyek."); return;
    }
    const first = parseISO(start);
    const count = differenceInCalendarDays(parseISO(last), first) + 1;
    if (!Number.isFinite(count) || count < 1 || count > 500) {
      setError("Maksimal 500 tanggal libur tambahan."); return;
    }
    const dates = [...new Set([...value, ...Array.from({ length: count }, (_, i) => format(addDays(first, i), "yyyy-MM-dd"))])].sort();
    if (dates.length > 500) { setError("Maksimal 500 tanggal libur tambahan."); return; }
    onChange(dates); setStart(""); setEnd(""); setError(null);
  };
  return (
    <details className="rounded-sm border border-border p-4">
      <summary className="cursor-pointer text-body-sm text-ink focus-ring">Hari libur tambahan ({value.length})</summary>
      <p className="mt-3 text-caption text-ink-muted">Sabtu–Minggu otomatis kosong. Tambahkan libur untuk seluruh stage proyek, lalu klik Simpan jadwal.</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Field label="Mulai libur">{(f) => <Input {...f} type="date" min={min} max={max} value={start} disabled={disabled} onChange={(e) => setStart(e.target.value)} />}</Field>
        <Field label="Sampai (opsional)">{(f) => <Input {...f} type="date" min={start || min} max={max} value={end} disabled={disabled} onChange={(e) => setEnd(e.target.value)} />}</Field>
        <Button type="button" onClick={add} disabled={disabled || !start}>Tambah libur</Button>
      </div>
      {error ? <Alert tone="error" title="Tanggal libur belum valid" compact>{error}</Alert> : null}
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Tanggal libur tambahan">
        {value.map((date) => <li key={date} className="flex items-center gap-2 rounded-sm border border-border px-2 py-1 text-caption text-ink-secondary">
          {fmtDate(date)}
          <button type="button" className="rounded-xs px-1 text-brand focus-ring" aria-label={`Hapus libur ${fmtDate(date)}`} disabled={disabled} onClick={() => onChange(value.filter((d) => d !== date))}>×</button>
        </li>)}
      </ul>
    </details>
  );
}
