import type { Finding } from "../model/types";
import { NETWORK_TEXT_FIELDS } from "../model/network-finding";

export function NetworkFindingDetails({ finding }: { finding: Finding }) {
  const rows = [
    ["Nama Perangkat", finding.device_name || finding.asset?.asset_name],
    ["IP", finding.ip_address || finding.asset?.ip_address],
    ...NETWORK_TEXT_FIELDS.map(([key, label]) => [label, finding[key]]),
    ["CWE", finding.cwe],
  ];
  return <dl className="grid w-full gap-3 rounded-sm border border-border p-4 text-body-sm sm:grid-cols-2">
    {rows.map(([label, value]) => <div key={label} className="min-w-0">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-ink-secondary">{value || "-"}</dd>
    </div>)}
  </dl>;
}
