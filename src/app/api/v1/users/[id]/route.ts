import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { authenticateApiToken } from "@/lib/api-tokens";
import { isUuid } from "@/lib/courses";
import { listUserEnrollments } from "@/lib/enrollments";

/** GET /api/v1/users/:id — a user with their enrollments and completion. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateApiToken(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [user] = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.id, id), eq(schema.users.orgId, auth.orgId)))
    .limit(1);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const enrollments = await listUserEnrollments(id);
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      active: user.active,
    },
    enrollments: enrollments.map((e) => ({
      courseId: e.courseId,
      title: e.title,
      assignedAt: e.assignedAt,
      completedAt: e.completedAt,
    })),
  });
}
