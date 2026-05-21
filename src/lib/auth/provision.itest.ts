import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { provisionUser } from "@/lib/auth/provision";

const SLUG = "itest-provision";

async function clean() {
  await db.delete(schema.orgs).where(eq(schema.orgs.slug, SLUG));
}

describe("provisionUser (DB)", () => {
  beforeEach(clean);
  afterAll(clean);

  it("creates the org and user on first sign-in", async () => {
    const user = await provisionUser({
      externalId: "ext-1",
      email: "ada@itest-provision.example",
      name: "Ada",
      role: "learner",
      orgSlug: SLUG,
    });

    expect(user.orgSlug).toBe(SLUG);
    expect(user.email).toBe("ada@itest-provision.example");
    expect(user.sessionEpoch).toBe(0);

    const [org] = await db
      .select()
      .from(schema.orgs)
      .where(eq(schema.orgs.slug, SLUG));
    expect(org).toBeDefined();
  });

  it("matches an existing user by email instead of duplicating", async () => {
    const first = await provisionUser({
      externalId: "ext-A",
      email: "sam@itest-provision.example",
      name: "Sam",
      role: "admin",
      orgSlug: SLUG,
    });

    // The same person signs in again — different external id, same email.
    const second = await provisionUser({
      externalId: "ext-B",
      email: "sam@itest-provision.example",
      name: "Sam R.",
      role: "learner",
      orgSlug: SLUG,
    });

    expect(second.id).toBe(first.id);
    // Role survives repeat logins — it is never overwritten by the IdP claim.
    expect(second.role).toBe("admin");
    expect(second.name).toBe("Sam R.");

    const rows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "sam@itest-provision.example"));
    expect(rows).toHaveLength(1);
  });

  it("carries the user's sessionEpoch through provisioning", async () => {
    const user = await provisionUser({
      externalId: "ext-e",
      email: "epoch@itest-provision.example",
      role: "learner",
      orgSlug: SLUG,
    });

    // Simulate an admin force-sign-out bumping the epoch.
    await db
      .update(schema.users)
      .set({ sessionEpoch: 7 })
      .where(eq(schema.users.id, user.id));

    const again = await provisionUser({
      externalId: "ext-e",
      email: "epoch@itest-provision.example",
      role: "learner",
      orgSlug: SLUG,
    });
    expect(again.sessionEpoch).toBe(7);
  });
});
