import { NextResponse } from "next/server";
import { authenticateApiToken } from "@/lib/api-tokens";
import { listCourses } from "@/lib/courses";

/** GET /api/v1/courses — every course in the token's org. */
export async function GET(req: Request) {
  const auth = await authenticateApiToken(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const courses = await listCourses(auth.orgId, { publishedOnly: false });
  return NextResponse.json({
    courses: courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      published: c.published,
    })),
  });
}
