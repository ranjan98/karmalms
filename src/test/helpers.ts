/**
 * Shared helpers for the DB integration suite. Each test file works inside its
 * own org (identified by a unique slug) and drops it when done — deleting the
 * org cascades to users, courses, webhooks and everything else.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

/** Creates a fresh org for a test file, replacing any leftover of the same slug. */
export async function createOrg(slug: string): Promise<string> {
  await db.delete(schema.orgs).where(eq(schema.orgs.slug, slug));
  const [org] = await db
    .insert(schema.orgs)
    .values({ name: slug, slug })
    .returning();
  return org.id;
}

/** Removes a test org and, by cascade, every row that belongs to it. */
export async function dropOrg(slug: string): Promise<void> {
  await db.delete(schema.orgs).where(eq(schema.orgs.slug, slug));
}
