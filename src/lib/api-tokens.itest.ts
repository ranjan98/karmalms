import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { createOrg, dropOrg } from "@/test/helpers";
import {
  generateApiToken,
  authenticateApiToken,
  canWrite,
} from "@/lib/api-tokens";

const SLUG = "itest-api-tokens";

let orgId: string;

beforeAll(async () => {
  orgId = await createOrg(SLUG);
});

afterAll(() => dropOrg(SLUG));

/** Builds a request carrying a Bearer token, the way the REST API receives it. */
function bearer(token: string): Request {
  return new Request("https://example.test/api/v1/courses", {
    headers: { authorization: `Bearer ${token}` },
  });
}

describe("API token authentication (DB)", () => {
  it("resolves the org and scope from a valid read-only token", async () => {
    const { token, hash } = generateApiToken();
    await db.insert(schema.apiTokens).values({
      orgId,
      name: "CI read token",
      tokenHash: hash,
      scope: "read",
    });

    const auth = await authenticateApiToken(bearer(token));
    expect(auth).toEqual({ orgId, scope: "read" });
    expect(canWrite(auth!)).toBe(false);
  });

  it("stamps lastUsedAt on the token row when authenticated", async () => {
    const { token, hash } = generateApiToken();
    const [row] = await db
      .insert(schema.apiTokens)
      .values({ orgId, name: "CI rw token", tokenHash: hash })
      .returning({ id: schema.apiTokens.id });

    const auth = await authenticateApiToken(bearer(token));
    expect(auth?.scope).toBe("readwrite");
    expect(canWrite(auth!)).toBe(true);

    const [after] = await db
      .select({ lastUsedAt: schema.apiTokens.lastUsedAt })
      .from(schema.apiTokens)
      .where(eq(schema.apiTokens.id, row.id));
    expect(after.lastUsedAt).toBeInstanceOf(Date);
  });

  it("rejects unknown, malformed, and missing tokens", async () => {
    expect(await authenticateApiToken(bearer("klms_deadbeef"))).toBeNull();
    expect(await authenticateApiToken(bearer("not-a-klms-token"))).toBeNull();
    expect(
      await authenticateApiToken(
        new Request("https://example.test/api/v1/courses"),
      ),
    ).toBeNull();
  });
});
