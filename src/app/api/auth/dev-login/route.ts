import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { config } from "@/lib/config";
import { createSession } from "@/lib/auth";

/**
 * Dev-only sign-in: issues a session for a seeded user, no identity provider.
 * Refuses unless AUTH_MODE is `dev` so it can never be reached in production.
 */
export async function POST(req: Request) {
  if (config.auth.mode !== "dev") {
    return new NextResponse("Dev login is disabled (AUTH_MODE is not 'dev').", {
      status: 403,
    });
  }

  const form = await req.formData();
  const userId = String(form.get("userId") ?? "");
  const returnTo = safeReturnTo(String(form.get("returnTo") ?? ""));

  const [row] = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.users.role,
      sessionEpoch: schema.users.sessionEpoch,
      orgId: schema.orgs.id,
      orgSlug: schema.orgs.slug,
    })
    .from(schema.users)
    .innerJoin(schema.orgs, eq(schema.users.orgId, schema.orgs.id))
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!row) {
    return new NextResponse("User not found.", { status: 404 });
  }

  await createSession({
    id: row.id,
    email: row.email,
    name: row.name ?? undefined,
    role: row.role,
    orgId: row.orgId,
    orgSlug: row.orgSlug,
    sessionEpoch: row.sessionEpoch,
  });

  return NextResponse.redirect(new URL(returnTo, config.appUrl), {
    status: 303,
  });
}

/** Only accept same-site relative paths as a redirect target. */
function safeReturnTo(value: string): string {
  return value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}
