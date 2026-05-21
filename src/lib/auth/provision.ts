/**
 * Just-in-time (JIT) provisioning.
 *
 * When an identity provider authenticates someone, KarmaLMS turns that
 * identity into local rows — creating the org and user on first sight.
 *
 * Existing users are matched by email within the org first, so a person who
 * was already created another way (a directory sync, SCIM, the REST API) is
 * updated rather than duplicated. Only first-ever users fall back to the
 * external id, and `role` is never overwritten on repeat logins.
 */
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { AuthUser } from "./types";
import type { SessionUser } from "./session-token";

export async function provisionUser(authUser: AuthUser): Promise<SessionUser> {
  // Find-or-create the org by slug.
  let [org] = await db
    .select()
    .from(schema.orgs)
    .where(eq(schema.orgs.slug, authUser.orgSlug))
    .limit(1);

  if (!org) {
    [org] = await db
      .insert(schema.orgs)
      .values({ name: authUser.orgSlug, slug: authUser.orgSlug })
      .returning();
  }

  // Match an existing user — by email if we have one, else by external id.
  let existing: typeof schema.users.$inferSelect | undefined;
  if (authUser.email) {
    [existing] = await db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.orgId, org.id),
          eq(schema.users.email, authUser.email),
        ),
      )
      .limit(1);
  }
  if (!existing) {
    [existing] = await db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.orgId, org.id),
          eq(schema.users.externalId, authUser.externalId),
        ),
      )
      .limit(1);
  }

  if (existing) {
    // Refresh the name when the IdP supplied one; keep role and externalId.
    // Skipping the update when there's no name avoids an empty `set({})`.
    if (authUser.name && authUser.name !== existing.name) {
      await db
        .update(schema.users)
        .set({ name: authUser.name })
        .where(eq(schema.users.id, existing.id));
    }
    return {
      id: existing.id,
      email: existing.email,
      name: authUser.name ?? existing.name ?? undefined,
      role: existing.role,
      orgId: org.id,
      orgSlug: org.slug,
      sessionEpoch: existing.sessionEpoch,
    };
  }

  const [created] = await db
    .insert(schema.users)
    .values({
      orgId: org.id,
      externalId: authUser.externalId,
      email: authUser.email,
      name: authUser.name,
      role: authUser.role,
    })
    .returning();

  return {
    id: created.id,
    email: created.email,
    name: created.name ?? undefined,
    role: created.role,
    orgId: org.id,
    orgSlug: org.slug,
    sessionEpoch: created.sessionEpoch,
  };
}
