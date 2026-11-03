import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Fixed timezone so date/ICS tests give the same answer on every machine (students are in PH).
process.env.TZ = "Asia/Manila";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
    },
  },
});
