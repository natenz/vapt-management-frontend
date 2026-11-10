import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { LoginPage } from "./login-page";

const authMutation = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useMutation: () => ({
      error: new Error("Unauthorized"),
      isPending: false,
      mutateAsync: authMutation.mutateAsync,
      reset: authMutation.reset,
    }),
  };
});

describe("LoginPage", () => {
  it("menganimasikan penutupan alert sebelum mereset error", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const alert = screen.getByRole("alert");
    const transitionContainer = alert.parentElement?.parentElement;
    expect(transitionContainer).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Tutup pesan" }));
    expect(transitionContainer).toHaveClass("grid-rows-[0fr]", "opacity-0");
    expect(authMutation.reset).not.toHaveBeenCalled();

    fireEvent.transitionEnd(transitionContainer!, { propertyName: "grid-template-rows" });
    expect(authMutation.reset).toHaveBeenCalledOnce();
  });
});
