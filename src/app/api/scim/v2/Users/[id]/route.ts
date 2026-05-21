import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { authenticateApiToken, canWrite } from "@/lib/api-tokens";
import { isUuid } from "@/lib/courses";
import {
  scimJson,
  scimError,
  toScimUser,
  scimName,
  applyScimPatch,
} from "@/lib/scim";

type Ctx = { params: Promise<{ id: string }> };

/** Loads a user scoped to the token's org. */
async function findUser(id: string, orgId: string) {
  if (!isUuid(id)) return null;
  const [user] = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.id, id), eq(schema.users.orgId, orgId)))
    .limit(1);
  return user ?? null;
}

export async function GET(req: Request, { params }: Ctx) {
  const auth = await authenticateApiToken(req);
  if (!auth) return scimError(401, "Unauthorized");

  const user = await findUser((await params).id, auth.orgId);
  if (!user) return scimError(404, "User not found");
  return scimJson(
    toScimUser({
      id: user.id,
      email: user.email,
      name: user.name,
      active: user.active,
    }),
  );
}

/** Full replace — updates the profile and active state. */
export async function PUT(req: Request, { params }: Ctx) {
  const auth = await authenticateApiToken(req);
  if (!auth) return scimError(401, "Unauthorized");
  if (!canWrite(auth)) return scimError(403, "This token is read-only");

  const user = await findUser((await params).id, auth.orgId);
  if (!user) return scimError(404, "User not found");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return scimError(400, "Invalid JSON body");
  }
  const name = scimName(body);
  const active = (body as { active?: unknown }).active !== false;

  await db
    .update(schema.users)
    .set({ name, active })
    .where(eq(schema.users.id, user.id));
  return scimJson(toScimUser({ id: user.id, email: user.email, name, active }));
}

/** Partial update — the path identity providers use to deprovision. */
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await authenticateApiToken(req);
  if (!auth) return scimError(401, "Unauthorized");
  if (!canWrite(auth)) return scimError(403, "This token is read-only");

  const user = await findUser((await params).id, auth.orgId);
  if (!user) return scimError(404, "User not found");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return scimError(400, "Invalid JSON body");
  }
  const patch = applyScimPatch(body);
  const name = patch.name ?? user.name;
  const active = patch.active ?? user.active;

  await db
    .update(schema.users)
    .set({ name, active })
    .where(eq(schema.users.id, user.id));
  return scimJson(toScimUser({ id: user.id, email: user.email, name, active }));
}

/** Deprovision — soft-deletes so training records are kept. */
export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await authenticateApiToken(req);
  if (!auth) return scimError(401, "Unauthorized");
  if (!canWrite(auth)) return scimError(403, "This token is read-only");

  const user = await findUser((await params).id, auth.orgId);
  if (!user) return scimError(404, "User not found");

  await db
    .update(schema.users)
    .set({ active: false })
    .where(eq(schema.users.id, user.id));
  return new Response(null, { status: 204 });
}
