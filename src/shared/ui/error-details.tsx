/**
 * Isi alert galat: pesan utama lalu rincian dari backend atau validasi kontrak
 * (mis. `"scoring" must contain at least 1 items`, `data.logs.2.logCreatedAt: …`).
 */
import { getErrorDetails, getErrorMessage } from "@/shared/api";

export function ErrorDetails({ error }: { error: unknown }) {
  const details = getErrorDetails(error);

  return (
    <>
      {getErrorMessage(error)}
      {details.length > 0 ? (
        <ul className="mt-2 list-disc pl-5 text-caption">
          {details.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
