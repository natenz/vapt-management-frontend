import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BentoCard, BentoGrid } from "../bento-grid";
import { AreaLineChart, DonutChart, StackedBarChart } from "./index";

describe("BentoGrid & BentoCard", () => {
  it("merender bento grid container dan kartu dengan atribut data-slot", () => {
    render(
      <BentoGrid data-testid="grid">
        <BentoCard title="Kartu Uji" description="Deskripsi singkat" colSpan={8}>
          <div>Konten Kartu</div>
        </BentoCard>
      </BentoGrid>,
    );

    expect(screen.getByTestId("grid")).toBeInTheDocument();
    expect(screen.getByText("Kartu Uji")).toBeInTheDocument();
    expect(screen.getByText("Deskripsi singkat")).toBeInTheDocument();
    expect(screen.getByText("Konten Kartu")).toBeInTheDocument();
  });
});

describe("Native SVG Charts", () => {
  it("AreaLineChart: merender sumbu Y, label sumbu X, dan garis data", () => {
    const data = [
      { label: "Jan", value: 10, secondaryValue: 5 },
      { label: "Feb", value: 20, secondaryValue: 12 },
    ];

    const { container } = render(
      <AreaLineChart data={data} height={180} seriesName="Aktif" />,
    );

    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByText("Jan")).toBeInTheDocument();
    expect(screen.getByText("Feb")).toBeInTheDocument();
  });

  it("DonutChart: merender segmen lingkaran dan label tengah", () => {
    const segments = [
      { label: "Critical", value: 4, color: "var(--color-sev-critical-bg)" },
      { label: "High", value: 8, color: "var(--color-sev-high-bg)" },
    ];

    render(
      <DonutChart
        segments={segments}
        centerValue={12}
        centerLabel="Findings"
      />,
    );

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Findings")).toBeInTheDocument();
    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("StackedBarChart: merender segmen proporsional beserta legend", () => {
    const items = [
      { label: "Scoping", count: 3, colorClass: "bg-sky-500" },
      { label: "Assessment", count: 7, colorClass: "bg-amber-500" },
    ];

    render(<StackedBarChart items={items} />);

    expect(screen.getByText("Scoping")).toBeInTheDocument();
    expect(screen.getByText("Assessment")).toBeInTheDocument();
    expect(screen.getByText(/70%/)).toBeInTheDocument();
  });
});
