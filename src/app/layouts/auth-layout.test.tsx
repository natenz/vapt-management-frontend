import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { AuthLayout } from "./auth-layout";
import { LoginPage } from "@/pages/login";

describe("AuthLayout", () => {
  it("menampilkan pernyataan keamanan tanpa menggandakan heading aksesibel", () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole("heading", {
        name: "VAPT Management",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Login" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Hubungi admin" })).toHaveAttribute("href", "#");
  });
});
