/**
 * Menguji dua aturan § Input / § 8 yang mudah hilang saat refactor:
 *
 *   "Validate on blur, not per keystroke."
 *   "Focus moves to the first invalid field."
 *
 * Plus perangkaian aksesibilitas <Field>: label selalu tersambung ke control,
 * dan pesan error terbaca screen reader lewat aria-describedby.
 */
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Field, FieldGroup, Input } from "./input";
import { Button } from "./button";

const schema = z.object({
  host: z.string().min(1, "Host wajib diisi"),
  label: z.string().min(3, "Minimal 3 karakter"),
});

function TestForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    shouldFocusError: true,
  });

  return (
    <form onSubmit={handleSubmit(() => undefined)}>
      <FieldGroup>
        <Field label="Host" error={errors.host?.message}>
          {(field) => <Input {...field} {...register("host")} />}
        </Field>
        <Field label="Label" error={errors.label?.message}>
          {(field) => <Input {...field} {...register("label")} />}
        </Field>
      </FieldGroup>
      <Button type="submit">Simpan</Button>
    </form>
  );
}

describe("Field", () => {
  it("menyambungkan label ke control tanpa perlu id manual", () => {
    render(<Field label="Host">{(field) => <Input {...field} />}</Field>);
    // getByLabelText hanya berhasil kalau htmlFor/id benar-benar terpasang.
    expect(screen.getByLabelText("Host")).toBeInTheDocument();
  });

  it("menyambungkan pesan error lewat aria-describedby dan menandai aria-invalid", () => {
    render(
      <Field label="Host" error="Host tidak dapat dijangkau">
        {(field) => <Input {...field} />}
      </Field>,
    );

    const input = screen.getByLabelText("Host");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Host tidak dapat dijangkau");
  });

  it("menyembunyikan helper dan menampilkan error saat keduanya ada", () => {
    render(
      <Field label="Host" helper="Host atau URL" error="Wajib diisi">
        {(field) => <Input {...field} />}
      </Field>,
    );

    expect(screen.getByText("Wajib diisi")).toBeInTheDocument();
    expect(screen.queryByText("Host atau URL")).not.toBeInTheDocument();
  });

  it("menampilkan metadata singkat sejajar dengan label", () => {
    render(
      <Field label="Periode selesai" labelMeta="Target klien: 17 Okt 2026">
        {(field) => <Input type="date" {...field} />}
      </Field>,
    );

    expect(screen.getByLabelText("Periode selesai")).toBeInTheDocument();
    expect(screen.getByText("Target klien: 17 Okt 2026")).toBeVisible();
  });
});

describe("validasi form", () => {
  it("tidak memvalidasi per ketukan, hanya saat blur", async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    const label = screen.getByLabelText("Label");

    // Mengetik nilai yang terlalu pendek: belum boleh ada error.
    await user.type(label, "ab");
    expect(screen.queryByText("Minimal 3 karakter")).not.toBeInTheDocument();

    // Setelah fokus berpindah, barulah pesannya muncul.
    await user.tab();
    await waitFor(() => {
      expect(screen.getByText("Minimal 3 karakter")).toBeInTheDocument();
    });
  });

  it("memindahkan fokus ke field invalid pertama saat submit", async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    await user.click(screen.getByRole("button", { name: "Simpan" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Host")).toHaveFocus();
    });
  });
});
