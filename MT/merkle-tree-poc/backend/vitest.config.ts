import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use an isolated data file so tests never touch real batch data.
    env: {
      DATA_FILE: "./data/test-batches.json"
    },
    include: ["test/**/*.test.ts"],
    environment: "node"
  }
});
