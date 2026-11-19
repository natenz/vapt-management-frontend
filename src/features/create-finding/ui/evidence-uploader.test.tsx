import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EvidenceUploader } from "./evidence-uploader";

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:photo-preview");
  URL.revokeObjectURL = vi.fn();
});
afterEach(cleanup);

function Upload({ disabled = false }: { disabled?: boolean }) {
  const [files, setFiles] = useState<File[]>([]);
  return <EvidenceUploader files={files} onChange={setFiles} disabled={disabled} />;
}

it("menerima foto lewat drag-drop dan bisa menghapusnya dari antrean", () => {
  render(<Upload />);
  const photo = new File([new Uint8Array(2048)], "bukti-login.png", { type: "image/png" });
  fireEvent.drop(screen.getByRole("group", { name: "Unggah foto evidence" }), { dataTransfer: { files: [photo] } });
  expect(screen.getByAltText("Pratinjau bukti-login.png")).toBeInTheDocument();
  expect(screen.getByText("2 KB")).toBeInTheDocument();
  expect(screen.getByText("1 dari 5 foto")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Hapus foto bukti-login.png" }));
  expect(screen.queryByAltText("Pratinjau bukti-login.png")).not.toBeInTheDocument();
});

it("menolak berkas selain foto dan memberi petunjuk perbaikan", () => {
  render(<Upload />);
  fireEvent.change(screen.getByLabelText("Foto evidence"), { target: { files: [new File(["pdf"], "dokumen.pdf", { type: "application/pdf" })] } });
  expect(screen.getByText("Gunakan foto PNG/JPEG maksimal 5 MB per foto.")).toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

it("mengunci pilihan dan drag-drop selama unggah berjalan", () => {
  render(<Upload disabled />);
  expect(screen.getByRole("button", { name: "Pilih foto" })).toBeDisabled();
  fireEvent.drop(screen.getByRole("group", { name: "Unggah foto evidence" }), { dataTransfer: { files: [new File(["png"], "foto.png", { type: "image/png" })] } });
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});
