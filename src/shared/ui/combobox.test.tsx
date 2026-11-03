import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { Combobox, filterOptions, type ComboOption } from "./combobox";

const opts: ComboOption[] = [
  { value: "1", label: "Budi Santoso", group: "Pentester", hint: "22 md", warn: true },
  { value: "2", label: "Citra Maharani", group: "Pentester", hint: "8 md" },
  { value: "3", label: "Eka Putri", group: "Technical Writer", hint: "12 md" },
];

describe("filterOptions", () => {
  it("menyaring tanpa peduli huruf besar dan urutan kata", () => {
    expect(filterOptions(opts, "santoso budi").map((o) => o.value)).toEqual(["1"]);
    expect(filterOptions(opts, "MAHA").map((o) => o.value)).toEqual(["2"]);
    expect(filterOptions(opts, "")).toHaveLength(3);
    expect(filterOptions(opts, "zzz")).toHaveLength(0);
  });
});

describe("Combobox", () => {
  it("mengetik menyaring daftar, Enter memilih opsi yang disorot", async () => {
    const onSelect = vi.fn();
    render(<Combobox options={opts} onSelect={onSelect} />);
    const input = screen.getByRole("combobox");
    await userEvent.click(input);
    expect(await screen.findAllByRole("option")).toHaveLength(3);
    await userEvent.type(input, "eka");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("3");
  });

  it("menampilkan teks kosong bila tidak ada yang cocok", async () => {
    render(<Combobox options={opts} onSelect={() => {}} />);
    await userEvent.type(screen.getByRole("combobox"), "xyz");
    expect(await screen.findByText("Tidak ada hasil")).toBeTruthy();
  });
});
