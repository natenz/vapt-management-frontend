/**
 * Menguji aturan § Button > Loading:
 *
 *   "Loading keeps the width and swaps the trailing icon for a 16px spinner."
 *
 * Dan konsekuensinya: tombol yang sedang memuat tidak boleh bisa diklik dua
 * kali, dan harus mengumumkan dirinya sibuk.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RefreshCw } from "lucide-react";
import { Button } from "./button";

describe("Button", () => {
  it("menukar trailing icon dengan spinner saat loading, bukan menambahkannya", () => {
    const { container, rerender } = render(
      <Button trailingIcon={<RefreshCw data-testid="trailing-icon" />}>Kirim</Button>,
    );

    expect(screen.getByTestId("trailing-icon")).toBeInTheDocument();
    const iconsAtRest = container.querySelectorAll("svg").length;

    rerender(
      <Button loading trailingIcon={<RefreshCw data-testid="trailing-icon" />}>
        Kirim
      </Button>,
    );

    // Ikon hilang, diganti spinner — jumlah ikon tetap sama, jadi lebar tidak berubah.
    expect(screen.queryByTestId("trailing-icon")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Memuat" })).toBeInTheDocument();
    expect(container.querySelectorAll("svg")).toHaveLength(iconsAtRest);
  });

  it("menonaktifkan dirinya dan mengumumkan sibuk saat loading", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button loading onClick={onClick}>
        Kirim
      </Button>,
    );

    const button = screen.getByRole("button", { name: /Kirim/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("memakai tinggi space-10 (40px) sesuai spec", () => {
    render(<Button>Kirim</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-10");
  });
});

/**
 * Regresi: Button dengan asChild DAN ikon.
 *
 * Radix Slot hanya menerima satu anak elemen. Tanpa Slottable, kombinasi
 * asChild + ikon melempar "Slot failed to slot onto its children" saat
 * runtime — dan itu tidak terdeteksi typecheck maupun build, hanya saat
 * halaman dibuka. Pola ini dipakai di beberapa halaman (tombol yang
 * sebenarnya sebuah tautan), jadi harus dijaga tes.
 */
describe("Button asChild", () => {
  it("merender sebagai elemen anak, bukan <button>", () => {
    render(
      <Button asChild>
        <a href="/findings">Lihat temuan</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Lihat temuan" });
    expect(link).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("menggabungkan ikon ke dalam elemen anak tanpa melempar", () => {
    const { container } = render(
      <Button asChild trailingIcon={<RefreshCw data-testid="trailing-icon" />}>
        <a href="/findings">Lihat temuan</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: /Lihat temuan/ });
    // Ikon harus berada DI DALAM tautan, bukan sebagai saudara di luarnya.
    expect(link).toContainElement(screen.getByTestId("trailing-icon"));
    expect(container.querySelectorAll("a")).toHaveLength(1);
  });

  it("menerima ikon depan dan belakang sekaligus", () => {
    render(
      <Button
        asChild
        leadingIcon={<RefreshCw data-testid="lead" />}
        trailingIcon={<RefreshCw data-testid="trail" />}
      >
        <a href="/findings">Lihat temuan</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: /Lihat temuan/ });
    expect(link).toContainElement(screen.getByTestId("lead"));
    expect(link).toContainElement(screen.getByTestId("trail"));
  });
});
