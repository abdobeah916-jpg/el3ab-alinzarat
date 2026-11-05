import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "كازينو الألعاب",
        short_name: "كازينو الألعاب",
        lang: "ar",
        dir: "rtl",
        theme_color: "#0A0806",
        background_color: "#0A0806",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ],
  server: { proxy: { "/api": "http://localhost:3000", "/socket.io": "http://localhost:3000" } },
  test: { environment: "jsdom", globals: true, setupFiles: ["./test/setup.ts"] }
});
