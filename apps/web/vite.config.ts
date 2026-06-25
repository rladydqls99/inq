import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["manifest.webmanifest", "icons/icon.svg", "icons/maskable.svg"],
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,webmanifest}"],
        navigateFallback: "/index.html",
      },
    }),
  ],
});
