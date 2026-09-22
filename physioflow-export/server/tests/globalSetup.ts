import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";

// Runs in a separate process BEFORE any test file (and its imports of app/db modules) loads.
// This matters: if the DB file were deleted/recreated from inside a setupFile instead, the
// app's already-imported better-sqlite3 connection would keep referencing the old (deleted)
// file handle, causing spurious "no such table" errors.
export default function globalSetup() {
  for (const f of ["./test.db", "./test.db-wal", "./test.db-shm"]) {
    if (existsSync(f)) unlinkSync(f);
  }
  execSync("npx tsx scripts/migrate.ts", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  });
}
