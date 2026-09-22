import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { env } from "../src/config/env.js";

const sqlite = new Database(env.DATABASE_PATH);
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: "./src/db/migrations" });

console.log("✅ Migrations applied to", env.DATABASE_PATH);
sqlite.close();
