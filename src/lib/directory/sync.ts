/**
 * Directory sync — pulls employees from the configured HRIS and reconciles
 * them into KarmaLMS users: profile, department, and reporting lines.
 *
 * Users are matched by email within the org, so a person who already exists
 * (e.g. from an SSO login) is updated rather than duplicated. New users start
 * as learners; an admin promotes them.
 */
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { config } from "@/lib/config";
import { directory } from "@/lib/directory";

export async function syncDirectory(): Promise<{
  synced: number;
  managersLinked: number;
}> {
  if (!directory.enabled) {
    throw new Error("No directory provider is configured.");
  }

  const employees = await directory.fetchEmployees();

  // Resolve (or create) the target org.
  const slug = config.directory.orgSlug;
  let [org] = await db
    .select()
    .from(schema.orgs)
    .where(eq(schema.orgs.slug, slug))
    .limit(1);
  if (!org) {
    [org] = await db
      .insert(schema.orgs)
      .values({ name: slug, slug })
      .returning();
  }

  // Pass 1 — upsert each employee, recording HRIS id -> KarmaLMS user id.
  const idToUser = new Map<string, string>();
  for (const emp of employees) {
    if (!emp.email) continue;

    const [existing] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.orgId, org.id),
          eq(schema.users.email, emp.email),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(schema.users)
        .set({ name: emp.name, department: emp.department ?? null })
        .where(eq(schema.users.id, existing.id));
      idToUser.set(emp.externalId, existing.id);
    } else {
      const [created] = await db
        .insert(schema.users)
        .values({
          orgId: org.id,
          externalId: `bamboohr:${emp.externalId}`,
          email: emp.email,
          name: emp.name,
          department: emp.department ?? null,
        })
        .returning({ id: schema.users.id });
      idToUser.set(emp.externalId, created.id);
    }
  }

  // Pass 2 — map reporting lines now that every user exists.
  let managersLinked = 0;
  for (const emp of employees) {
    const userId = idToUser.get(emp.externalId);
    const managerId = emp.managerExternalId
      ? idToUser.get(emp.managerExternalId)
      : undefined;
    if (userId && managerId && userId !== managerId) {
      await db
        .update(schema.users)
        .set({ managerId })
        .where(eq(schema.users.id, userId));
      managersLinked += 1;
    }
  }

  return { synced: idToUser.size, managersLinked };
}
