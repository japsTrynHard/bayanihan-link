import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.{js,jsx}"],
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
