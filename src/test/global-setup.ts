/**
 * One-time setup for the DB integration suite (`*.itest.ts`).
 *
 * Applies every migration to the database named by DATABASE_URL, then wipes
 * existing rows so each run starts from a clean slate. Point DATABASE_URL at a
 * throwaway test database — never a database with real data.
 */
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

export default async function setup() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL must point to a test database to run integration tests.",
    );
  }

  const pool = new Pool({ connectionString: url });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
    // Truncating orgs cascades to every other table — they all reference it.
    await pool.query("TRUNCATE TABLE orgs RESTART IDENTITY CASCADE");
  } finally {
    await pool.end();
  }
}
