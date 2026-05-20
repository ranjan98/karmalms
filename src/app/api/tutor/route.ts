import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCourse } from "@/lib/courses";
import { askTutor } from "@/lib/tutor";

/** Answers a learner's question, grounded in the course's lessons. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { courseId?: string; question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const courseId = String(body.courseId ?? "");
  const question = String(body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "Ask a question." }, { status: 400 });
  }

  const course = await getCourse(courseId, user.orgId);
  if (!course || (user.role !== "admin" && !course.published)) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  try {
    return NextResponse.json(await askTutor(courseId, question));
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "The tutor failed to answer.",
      },
      { status: 500 },
    );
  }
}
