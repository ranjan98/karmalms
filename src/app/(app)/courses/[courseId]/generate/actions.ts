"use server";

import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getCourse, listLessons } from "@/lib/courses";
import { getQuiz, listQuestions } from "@/lib/quizzes";
import { generateCourseDraft } from "@/lib/authoring";

/**
 * Generates lessons and quiz questions from a pasted document and appends
 * them to the course. Admin-only. The new content is a draft — the admin
 * reviews and edits it afterward.
 */
export async function generateCourseContent(
  formData: FormData,
): Promise<void> {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Error("Admin access is required.");
  }

  const courseId = String(formData.get("courseId") ?? "").trim();
  const document = String(formData.get("document") ?? "").trim();

  const course = await getCourse(courseId, user.orgId);
  if (!course) throw new Error("Course not found.");
  if (document.length < 50) {
    throw new Error("Paste a longer document to generate a course from.");
  }

  const draft = await generateCourseDraft(document);

  const existingLessons = await listLessons(courseId);
  await db.insert(schema.lessons).values(
    draft.lessons.map((lesson, i) => ({
      courseId,
      title: lesson.title,
      position: existingLessons.length + i,
      content: { body: lesson.body },
    })),
  );

  if (draft.quiz.length > 0) {
    let quiz = await getQuiz(courseId);
    if (!quiz) {
      const [created] = await db
        .insert(schema.quizzes)
        .values({ courseId })
        .returning();
      quiz = created;
    }
    const quizId = quiz.id;
    const existingQuestions = await listQuestions(quizId);
    await db.insert(schema.quizQuestions).values(
      draft.quiz.map((q, i) => ({
        quizId,
        prompt: q.prompt,
        options: q.options,
        correctIndex: q.correctIndex,
        position: existingQuestions.length + i,
      })),
    );
  }

  redirect(`/courses/${courseId}`);
}
