import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Bind IPv4 eksplisit: default Node 22 di Windows hanya mendengarkan ::1,
    // dan Chrome mencoba 127.0.0.1 lebih dulu sehingga koneksi ditolak.
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // Izinkan semua host dari ngrok (free/paid/custom domain) dan IP lokal WiFi
    allowedHosts: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 10_000,
  },
});
