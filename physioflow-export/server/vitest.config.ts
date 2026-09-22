import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "file:./test.db",
      JWT_ACCESS_SECRET: "test_access_secret_1234567890",
      JWT_REFRESH_SECRET: "test_refresh_secret_1234567890",
      CLIENT_ORIGIN: "http://localhost:5173",
    },
    setupFiles: [],
    globalSetup: "./tests/globalSetup.ts",
  },
});
