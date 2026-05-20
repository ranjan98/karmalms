"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getCourse, getLesson, isUuid, listLessons } from "@/lib/courses";
import { getEnrollment, markCourseCompletion } from "@/lib/enrollments";
import { getQuiz } from "@/lib/quizzes";

/** Course authoring is admin-only. */
async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Error("Admin access is required to manage courses.");
  }
  return user;
}

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

/** Parses the certificate validity field — a positive day count, or null. */
function parseValidityDays(raw: string): number | null {
  const n = Number(raw);
  return raw && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

// --- Courses -------------------------------------------------------------

export async function createCourse(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const title = field(formData, "title");
  if (!title) throw new Error("A course title is required.");

  const [course] = await db
    .insert(schema.courses)
    .values({ orgId: user.orgId, title, createdBy: user.id })
    .returning();

  redirect(`/courses/${course.id}`);
}

export async function updateCourse(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const courseId = field(formData, "courseId");
  const course = await getCourse(courseId, user.orgId);
  if (!course) throw new Error("Course not found.");

  const title = field(formData, "title");
  if (!title) throw new Error("A course title is required.");

  await db
    .update(schema.courses)
    .set({
      title,
      description: field(formData, "description") || null,
      published: formData.get("published") === "on",
      certificateValidityDays: parseValidityDays(
        field(formData, "certificateValidityDays"),
      ),
    })
    .where(eq(schema.courses.id, courseId));

  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
}

export async function deleteCourse(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const courseId = field(formData, "courseId");
  const course = await getCourse(courseId, user.orgId);
  if (!course) throw new Error("Course not found.");

  await db.delete(schema.courses).where(eq(schema.courses.id, courseId));
  redirect("/courses");
}

// --- Lessons -------------------------------------------------------------

export async function createLesson(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const courseId = field(formData, "courseId");
  const course = await getCourse(courseId, user.orgId);
  if (!course) throw new Error("Course not found.");

  const title = field(formData, "title");
  if (!title) throw new Error("A lesson title is required.");

  const existing = await listLessons(courseId);
  const [lesson] = await db
    .insert(schema.lessons)
    .values({
      courseId,
      title,
      position: existing.length,
      content: { body: "" },
    })
    .returning();

  redirect(`/courses/${courseId}/lessons/${lesson.id}`);
}

export async function updateLesson(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const courseId = field(formData, "courseId");
  const lessonId = field(formData, "lessonId");
  const course = await getCourse(courseId, user.orgId);
  if (!course) throw new Error("Course not found.");
  const lesson = await getLesson(lessonId, courseId);
  if (!lesson) throw new Error("Lesson not found.");

  const title = field(formData, "title");
  if (!title) throw new Error("A lesson title is required.");

  await db
    .update(schema.lessons)
    .set({ title, content: { body: String(formData.get("body") ?? "") } })
    .where(eq(schema.lessons.id, lessonId));

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`);
}

export async function deleteLesson(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const courseId = field(formData, "courseId");
  const lessonId = field(formData, "lessonId");
  const course = await getCourse(courseId, user.orgId);
  if (!course) throw new Error("Course not found.");
  const lesson = await getLesson(lessonId, courseId);
  if (!lesson) throw new Error("Lesson not found.");

  await db.delete(schema.lessons).where(eq(schema.lessons.id, lessonId));
  redirect(`/courses/${courseId}`);
}

/** Swaps a lesson with its neighbor to move it up or down the order. */
export async function moveLesson(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const courseId = field(formData, "courseId");
  const lessonId = field(formData, "lessonId");
  const direction = field(formData, "direction");
  const course = await getCourse(courseId, user.orgId);
  if (!course) throw new Error("Course not found.");

  const lessons = await listLessons(courseId);
  const index = lessons.findIndex((l) => l.id === lessonId);
  const swapWith = direction === "up" ? index - 1 : index + 1;

  if (index !== -1 && swapWith >= 0 && swapWith < lessons.length) {
    const a = lessons[index];
    const b = lessons[swapWith];
    await db
      .update(schema.lessons)
      .set({ position: b.position })
      .where(eq(schema.lessons.id, a.id));
    await db
      .update(schema.lessons)
      .set({ position: a.position })
      .where(eq(schema.lessons.id, b.id));
  }

  revalidatePath(`/courses/${courseId}`);
}

// --- Enrollment (admin assigns courses to people) ------------------------

export async function assignCourse(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const courseId = field(formData, "courseId");
  const targetUserId = field(formData, "userId");
  const course = await getCourse(courseId, user.orgId);
  if (!course) throw new Error("Course not found.");
  if (!isUuid(targetUserId)) throw new Error("User not found.");

  const [target] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.id, targetUserId),
        eq(schema.users.orgId, user.orgId),
      ),
    )
    .limit(1);
  if (!target) throw new Error("User not found.");

  await db
    .insert(schema.enrollments)
    .values({ userId: targetUserId, courseId })
    .onConflictDoNothing();

  revalidatePath(`/courses/${courseId}`);
}

export async function unassignCourse(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const courseId = field(formData, "courseId");
  const targetUserId = field(formData, "userId");
  const course = await getCourse(courseId, user.orgId);
  if (!course) throw new Error("Course not found.");
  if (!isUuid(targetUserId)) return;

  await db
    .delete(schema.enrollments)
    .where(
      and(
        eq(schema.enrollments.courseId, courseId),
        eq(schema.enrollments.userId, targetUserId),
      ),
    );

  revalidatePath(`/courses/${courseId}`);
}

// --- Progress (a learner completes lessons) ------------------------------

export async function completeLesson(formData: FormData): Promise<void> {
  const user = await requireUser();
  const courseId = field(formData, "courseId");
  const lessonId = field(formData, "lessonId");

  const course = await getCourse(courseId, user.orgId);
  if (!course) throw new Error("Course not found.");
  const lesson = await getLesson(lessonId, courseId);
  if (!lesson) throw new Error("Lesson not found.");
  const enrollment = await getEnrollment(user.id, courseId);
  if (!enrollment) throw new Error("You are not enrolled in this course.");

  await db
    .insert(schema.lessonProgress)
    .values({ userId: user.id, lessonId })
    .onConflictDoNothing();

  await markCourseCompletion(user.id, courseId);
  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`);
}

export async function uncompleteLesson(formData: FormData): Promise<void> {
  const user = await requireUser();
  const courseId = field(formData, "courseId");
  const lessonId = field(formData, "lessonId");

  const course = await getCourse(courseId, user.orgId);
  if (!course) throw new Error("Course not found.");
  const lesson = await getLesson(lessonId, courseId);
  if (!lesson) throw new Error("Lesson not found.");

  await db
    .delete(schema.lessonProgress)
    .where(
      and(
        eq(schema.lessonProgress.userId, user.id),
        eq(schema.lessonProgress.lessonId, lessonId),
      ),
    );

  await markCourseCompletion(user.id, courseId);
  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`);
}

/**
 * Clears a learner's progress for a course so they can take it again — used
 * to recertify after a certificate lapses. Self-service.
 */
export async function retakeCourse(formData: FormData): Promise<void> {
  const user = await requireUser();
  const courseId = field(formData, "courseId");
  const course = await getCourse(courseId, user.orgId);
  if (!course) throw new Error("Course not found.");
  const enrollment = await getEnrollment(user.id, courseId);
  if (!enrollment) throw new Error("You are not enrolled in this course.");

  const lessons = await listLessons(courseId);
  if (lessons.length > 0) {
    await db.delete(schema.lessonProgress).where(
      and(
        eq(schema.lessonProgress.userId, user.id),
        inArray(
          schema.lessonProgress.lessonId,
          lessons.map((l) => l.id),
        ),
      ),
    );
  }

  const quiz = await getQuiz(courseId);
  if (quiz) {
    await db
      .delete(schema.quizAttempts)
      .where(
        and(
          eq(schema.quizAttempts.userId, user.id),
          eq(schema.quizAttempts.quizId, quiz.id),
        ),
      );
  }

  await db
    .update(schema.enrollments)
    .set({ completedAt: null })
    .where(eq(schema.enrollments.id, enrollment.id));

  // Recomputes completion (now incomplete) — which also revokes the cert.
  await markCourseCompletion(user.id, courseId);
  revalidatePath(`/courses/${courseId}`);
}
