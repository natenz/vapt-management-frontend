import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { GuidelinePage } from "./guideline-page";

describe("GuidelinePage", () => {
  it("merender banner under construction dan teks fitur sedang dibangun", () => {
    render(
      <MemoryRouter>
        <GuidelinePage />
      </MemoryRouter>,
    );

    // Header halaman
    expect(screen.getByRole("heading", { level: 1, name: "Guideline VAPT" })).toBeInTheDocument();

    // Badge status & heading status
    expect(screen.getByText("Dalam Tahap Pengembangan")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Fitur Sedang Dibangun" })).toBeInTheDocument();

    // Deskripsi
    expect(
      screen.getByText(/Modul panduan dan metodologi pengujian keamanan VAPT/i),
    ).toBeInTheDocument();

    // Tombol navigasi
    const dashboardLink = screen.getByRole("link", { name: /Kembali ke Dashboard/i });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");

    expect(screen.queryByRole("link", { name: /Lihat Katalog Kerentanan/i })).not.toBeInTheDocument();
  });
});
