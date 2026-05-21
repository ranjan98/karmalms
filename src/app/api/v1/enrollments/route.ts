import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { authenticateApiToken } from "@/lib/api-tokens";
import { isUuid } from "@/lib/courses";

/** POST /api/v1/enrollments — assign a course to a user: { userId, courseId }. */
export async function POST(req: Request) {
  const auth = await authenticateApiToken(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { userId?: string; courseId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userId = String(body.userId ?? "");
  const courseId = String(body.courseId ?? "");
  if (!isUuid(userId) || !isUuid(courseId)) {
    return NextResponse.json(
      { error: "userId and courseId are required" },
      { status: 400 },
    );
  }

  // Both the user and the course must belong to the token's org.
  const [user] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(and(eq(schema.users.id, userId), eq(schema.users.orgId, auth.orgId)))
    .limit(1);
  const [course] = await db
    .select({ id: schema.courses.id })
    .from(schema.courses)
    .where(
      and(eq(schema.courses.id, courseId), eq(schema.courses.orgId, auth.orgId)),
    )
    .limit(1);
  if (!user || !course) {
    return NextResponse.json(
      { error: "User or course not found" },
      { status: 404 },
    );
  }

  await db
    .insert(schema.enrollments)
    .values({ userId, courseId })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true, userId, courseId }, { status: 201 });
}
