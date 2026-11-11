import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "vendor/core"),
      "@site": path.resolve(__dirname, "vendor/site"),
      "@": path.resolve(__dirname),
    },
  },
  test: { include: ["tests/**/*.test.{ts,tsx}"], environment: "node" },
});
