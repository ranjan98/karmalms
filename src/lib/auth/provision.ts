/**
 * Just-in-time (JIT) provisioning.
 *
 * When an identity provider authenticates someone, KarmaLMS turns that
 * identity into local rows — creating the org and user on first sight. The
 * IdP stays the source of truth for identity; KarmaLMS only stores a
 * reference (`externalId`) plus role and profile.
 */
import { eq } from "drizzle-orm";
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

  // Upsert the user on (orgId, externalId). On repeat logins we refresh the
  // profile but never overwrite `role` — that may have been changed in-app.
  const [user] = await db
    .insert(schema.users)
    .values({
      orgId: org.id,
      externalId: authUser.externalId,
      email: authUser.email,
      name: authUser.name,
      role: authUser.role,
    })
    .onConflictDoUpdate({
      target: [schema.users.orgId, schema.users.externalId],
      set: { email: authUser.email, name: authUser.name },
    })
    .returning();

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
    role: user.role,
    orgId: org.id,
    orgSlug: org.slug,
  };
}
