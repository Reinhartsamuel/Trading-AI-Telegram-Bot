import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { config } from "@/config/env";
import path from "path";

async function runMigrations() {
  const sql = postgres(config.DATABASE_URL, { max: 1 });
  const db = drizzle(sql, {});

  console.log("Running migrations...");

  try {
    await migrate(db, {
      migrationsFolder: path.join(process.cwd(), "drizzle/migrations"),
    });
    console.log("✓ Migrations completed");
  } catch (error) {
    console.error("✗ Migration failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

runMigrations().catch(console.error);
