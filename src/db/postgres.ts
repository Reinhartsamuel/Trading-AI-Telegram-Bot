import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "@/config/env";
import * as schema from "./schema";

let db: ReturnType<typeof drizzle> | null = null;

export async function initializeDatabase() {
  if (db) return db;

  const sql = postgres(config.DATABASE_URL, {
    max: 10,
    idle_timeout: 30,
  });

  db = drizzle(sql, { schema });

  try {
    // Test connection
    await sql`SELECT 1`;
    console.log("✓ Database connected");
  } catch (error) {
    console.error("✗ Database connection failed:", error);
    throw error;
  }

  return db;
}

export function getDatabase() {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return db;
}

export async function closeDatabase() {
  if (db) {
    const connection = (db as any)._ as any;
    if (connection) {
      await connection.end();
      db = null;
      console.log("✓ Database disconnected");
    }
  }
}
