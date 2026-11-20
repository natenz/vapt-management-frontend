import type { Finding } from "../model/types";
import { APPLICATION_TEXT_FIELDS, findingKind, OWASP_MOBILE_2024 } from "../model/application-finding";
import { NetworkFindingDetails } from "./network-finding-details";

export function FindingDetails({ finding: f, assetType }: { finding: Finding; assetType?: string | null }) {
  const kind = findingKind(assetType ?? f.asset?.asset_type);
  if (kind === "network" || kind === "other" && (f.device_name || f.test_scenario)) return <NetworkFindingDetails finding={f} />;
  if (kind === "other" && !f.app_name && !f.object_source) return null;
  const mobile = kind === "mobile" || kind === "other" && Boolean(f.object_source);
  const category = OWASP_MOBILE_2024.find(([code]) => code === f.owasp_mobile_2024);
  const rows = [
    ["APP Name", f.app_name || f.asset?.asset_name],
    ...(mobile ? [["Object Source", f.object_source], ["Tools", f.tools]] : [["IP/DOMAIN", f.ip_domain || f.asset?.domain || f.asset?.ip_address]]),
    ["Endpoint", f.endpoint], ["Platform", f.platform],
    ...APPLICATION_TEXT_FIELDS.map(([key, label]) => [label, f[key]]),
    ["CWE", f.cwe],
    ...(mobile ? [["OWASP Mobile Top 10 2024", category ? category.join(": ") : f.owasp_mobile_2024]] : []),
  ];
  return <dl className="grid w-full gap-3 rounded-sm border border-border p-4 text-body-sm sm:grid-cols-2">
    {rows.map(([label, value]) => <div key={label} className="min-w-0">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-ink-secondary">{value || "-"}</dd>
    </div>)}
  </dl>;
}
