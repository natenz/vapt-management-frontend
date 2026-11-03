/**
 * Menguji aturan § Badge: "Never use color alone: pair every status with an
 * icon or dot and a word."
 *
 * SeverityBadge merender ikon dan kata dari peta internal, bukan dari props,
 * jadi tes ini memastikan tidak ada severity yang lolos tanpa keduanya.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeverityBadge, SEVERITY_ORDER, severityRank } from "./severity-badge";

describe("SeverityBadge", () => {
  it("merender ikon dan kata untuk setiap severity", () => {
    for (const severity of SEVERITY_ORDER) {
      const { container, unmount } = render(<SeverityBadge severity={severity} />);
      const badge = container.querySelector('[data-slot="severity-badge"]');

      expect(badge, `${severity} harus merender badge`).not.toBeNull();
      // Kata: teksnya tidak boleh kosong setelah ikon diabaikan.
      expect(badge?.textContent?.trim(), `${severity} harus punya kata`).not.toBe("");
      // Ikon: satu SVG dari lucide.
      expect(badge?.querySelector("svg"), `${severity} harus punya ikon`).not.toBeNull();

      unmount();
    }
  });

  it("menandai severity lewat data-attribute agar bisa diuji dan di-style", () => {
    render(<SeverityBadge severity="critical" />);
    expect(screen.getByText("Critical").closest("[data-severity]")).toHaveAttribute(
      "data-severity",
      "critical",
    );
  });

  it("memakai ground solid hanya untuk Critical", () => {
    const { container: critical } = render(<SeverityBadge severity="critical" />);
    const { container: high } = render(<SeverityBadge severity="high" />);

    // Critical: teks inverse di atas ground penuh.
    expect(critical.querySelector('[data-slot="severity-badge"]')?.className).toContain(
      "text-sev-critical-fg",
    );
    // Sisanya: tinted, teks sewarna identitasnya.
    expect(high.querySelector('[data-slot="severity-badge"]')?.className).toContain(
      "bg-sev-high-bg",
    );
  });

  it("mengurutkan severity dari yang paling berat", () => {
    expect(severityRank("critical")).toBe(0);
    expect(severityRank("info")).toBe(SEVERITY_ORDER.length - 1);

    const shuffled = ["low", "critical", "medium"] as const;
    expect([...shuffled].sort((a, b) => severityRank(a) - severityRank(b))).toEqual([
      "critical",
      "medium",
      "low",
    ]);
  });

  it("menampilkan jumlah dengan angka tabular saat diberikan", () => {
    render(<SeverityBadge severity="high" count={11} />);
    expect(screen.getByText("11")).toHaveClass("tabular");
  });
});
