import { RouterProvider } from "react-router";
import { QueryProvider } from "@/app/providers";
import { router } from "@/app/router";
import { Toaster } from "@/shared/ui/toast";
import "@/app/auth-wiring";

export function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
      <Toaster />
    </QueryProvider>
  );
}
