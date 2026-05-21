/**
 * Per-file setup for the DB integration suite. Closes the shared connection
 * pool after each test file so the worker process can exit cleanly.
 */
import { afterAll } from "vitest";
import { pool } from "@/db";

afterAll(async () => {
  await pool.end();
});
