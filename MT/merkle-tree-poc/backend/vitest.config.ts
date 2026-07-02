import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use an isolated data file so tests never touch real batch data.
    env: {
      DATA_FILE: "./data/test-batches.json",
      LOG_LEVEL: "silent"
    },
    include: ["test/**/*.test.ts"],
    environment: "node",
    // Run all test files in a SINGLE child process. The native `keccak`
    // binding (via the keccak256 pkg) can corrupt the heap when driven from
    // multiple worker threads concurrently; a single fork makes the suite
    // deterministic without changing any test logic.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } }
  }
});
