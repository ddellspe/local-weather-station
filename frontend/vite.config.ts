import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://weather.ddellspe.net",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    // Disable inlining of assets as base64 strings (set to 0 to always emit files)
    assetsInlineLimit: 0,
    // Use plain filenames without hashes for easier debugging and caching control
    rollupOptions: {
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
  },
  test: {
    environment: "happy-dom",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*"],
      exclude: [
        "src/main.tsx",
        "src/vite-env.d.ts",
        "**/*.test.tsx",
        "**/*.test.ts",
        "**/*.d.ts",
        "**/*.css",
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
