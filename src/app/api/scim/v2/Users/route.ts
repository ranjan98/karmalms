import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { authenticateApiToken } from "@/lib/api-tokens";
import {
  scimJson,
  scimError,
  toScimUser,
  scimListResponse,
  scimEmail,
  scimName,
  scimUserNameFilter,
} from "@/lib/scim";

/** GET /api/scim/v2/Users — list users (supports a `userName eq` filter). */
export async function GET(req: Request) {
  const auth = await authenticateApiToken(req);
  if (!auth) return scimError(401, "Unauthorized");

  const filterEmail = scimUserNameFilter(
    new URL(req.url).searchParams.get("filter"),
  );
  const rows = await db
    .select()
    .from(schema.users)
    .where(
      filterEmail
        ? and(
            eq(schema.users.orgId, auth.orgId),
            eq(schema.users.email, filterEmail),
          )
        : eq(schema.users.orgId, auth.orgId),
    );

  return scimJson(scimListResponse(rows));
}

/** POST /api/scim/v2/Users — provision a user (upsert by email). */
export async function POST(req: Request) {
  const auth = await authenticateApiToken(req);
  if (!auth) return scimError(401, "Unauthorized");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return scimError(400, "Invalid JSON body");
  }

  const email = scimEmail(body);
  if (!email) return scimError(400, "userName or emails is required");
  const name = scimName(body);

  const [existing] = await db
    .select()
    .from(schema.users)
    .where(
      and(eq(schema.users.orgId, auth.orgId), eq(schema.users.email, email)),
    )
    .limit(1);

  if (existing) {
    await db
      .update(schema.users)
      .set({ name, active: true })
      .where(eq(schema.users.id, existing.id));
    return scimJson(
      toScimUser({ id: existing.id, email, name, active: true }),
    );
  }

  const [created] = await db
    .insert(schema.users)
    .values({
      orgId: auth.orgId,
      externalId: `scim:${email}`,
      email,
      name,
    })
    .returning();

  return scimJson(
    toScimUser({
      id: created.id,
      email: created.email,
      name: created.name,
      active: created.active,
    }),
    201,
  );
}
