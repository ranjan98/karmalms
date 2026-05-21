import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "@/lib/config";
import * as schema from "./schema";

const pool = new Pool({ connectionString: config.databaseUrl });

export const db = drizzle(pool, { schema });
// `pool` is exported so the integration test suite can close it cleanly.
export { schema, pool };
