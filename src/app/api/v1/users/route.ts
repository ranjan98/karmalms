import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { authenticateApiToken, canWrite } from "@/lib/api-tokens";
import { listOrgUsers } from "@/lib/enrollments";

/** GET /api/v1/users — list users in the token's org. */
export async function GET(req: Request) {
  const auth = await authenticateApiToken(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await listOrgUsers(auth.orgId);
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      department: u.department,
      active: u.active,
    })),
  });
}

/** POST /api/v1/users — create or update a user, keyed by email. */
export async function POST(req: Request) {
  const auth = await authenticateApiToken(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canWrite(auth)) {
    return NextResponse.json(
      { error: "This token is read-only" },
      { status: 403 },
    );
  }

  let body: { email?: string; name?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }
  const name = body.name ? String(body.name) : null;
  const role =
    body.role === "admin" || body.role === "manager" ? body.role : "learner";

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
      .set({ name })
      .where(eq(schema.users.id, existing.id));
    return NextResponse.json({
      user: { id: existing.id, email, name, role: existing.role },
    });
  }

  const [created] = await db
    .insert(schema.users)
    .values({ orgId: auth.orgId, externalId: `api:${email}`, email, name, role })
    .returning({ id: schema.users.id });

  return NextResponse.json(
    { user: { id: created.id, email, name, role } },
    { status: 201 },
  );
}
