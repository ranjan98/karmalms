/**
 * API token issuance and authentication for the REST API. Tokens are bearer
 * credentials scoped to an org; only their SHA-256 hash is stored.
 */
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

const TOKEN_PREFIX = "klms_";

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** A fresh token plus its hash — store the hash, show the token once. */
export function generateApiToken(): { token: string; hash: string } {
  const token = TOKEN_PREFIX + crypto.randomBytes(24).toString("hex");
  return { token, hash: hashToken(token) };
}

export async function listApiTokens(orgId: string) {
  return db
    .select({
      id: schema.apiTokens.id,
      name: schema.apiTokens.name,
      lastUsedAt: schema.apiTokens.lastUsedAt,
      createdAt: schema.apiTokens.createdAt,
    })
    .from(schema.apiTokens)
    .where(eq(schema.apiTokens.orgId, orgId))
    .orderBy(schema.apiTokens.createdAt);
}

/**
 * Resolves the org from a request's `Authorization: Bearer <token>` header.
 * Returns null when the token is missing or unknown. Updates `lastUsedAt`.
 */
export async function authenticateApiToken(
  req: Request,
): Promise<{ orgId: string } | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const token = header.slice(7).trim();
  if (!token.startsWith(TOKEN_PREFIX)) return null;

  const [row] = await db
    .select({ id: schema.apiTokens.id, orgId: schema.apiTokens.orgId })
    .from(schema.apiTokens)
    .where(eq(schema.apiTokens.tokenHash, hashToken(token)))
    .limit(1);
  if (!row) return null;

  await db
    .update(schema.apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiTokens.id, row.id));

  return { orgId: row.orgId };
}
