import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  oxc: {
    include: /\.[jt]sx?$/,
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
  build: {
    outDir: "build",
    sourcemap: false,
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("@babylonjs/loaders")) return "babylon-loaders";
          if (id.includes("@babylonjs/core")) return "babylon-core";
          if (
            id.includes("/recharts/") ||
            id.includes("/d3-") ||
            id.includes("/victory-vendor/")
          ) {
            return "charts";
          }
          if (id.includes("/lucide-react/")) return "icons";
          return undefined;
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
    css: true,
    restoreMocks: true,
    testTimeout: 15000,
  },
});
