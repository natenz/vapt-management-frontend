import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Alert } from "@/shared/ui/alert";

describe("Alert", () => {
  it("dapat ditutup melalui tombol aksesibel", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(
      <Alert tone="error" title="Email atau password tidak valid" compact onDismiss={onDismiss} />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Email atau password tidak valid");
    await user.click(screen.getByRole("button", { name: "Tutup pesan" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
