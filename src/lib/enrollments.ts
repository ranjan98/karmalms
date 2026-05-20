/**
 * Enrollment and progress queries — assigning courses to people and tracking
 * how far each learner has got.
 */
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { isUuid, listLessons } from "@/lib/courses";
import { quizGate, hasPassedQuiz } from "@/lib/quizzes";

export async function listOrgUsers(orgId: string) {
  return db
    .select()
    .from(schema.users)
    .where(eq(schema.users.orgId, orgId))
    .orderBy(schema.users.name);
}

export async function getEnrollment(userId: string, courseId: string) {
  if (!isUuid(userId) || !isUuid(courseId)) return null;
  const [enrollment] = await db
    .select()
    .from(schema.enrollments)
    .where(
      and(
        eq(schema.enrollments.userId, userId),
        eq(schema.enrollments.courseId, courseId),
      ),
    )
    .limit(1);
  return enrollment ?? null;
}

/** Everyone enrolled in a course, with their user details. */
export async function listCourseEnrollments(courseId: string) {
  if (!isUuid(courseId)) return [];
  return db
    .select({
      userId: schema.users.id,
      userName: schema.users.name,
      userEmail: schema.users.email,
      assignedAt: schema.enrollments.assignedAt,
      completedAt: schema.enrollments.completedAt,
    })
    .from(schema.enrollments)
    .innerJoin(schema.users, eq(schema.enrollments.userId, schema.users.id))
    .where(eq(schema.enrollments.courseId, courseId));
}

/** Every course a user is enrolled in, with course details. */
export async function listUserEnrollments(userId: string) {
  if (!isUuid(userId)) return [];
  return db
    .select({
      courseId: schema.courses.id,
      title: schema.courses.title,
      description: schema.courses.description,
      published: schema.courses.published,
      assignedAt: schema.enrollments.assignedAt,
      completedAt: schema.enrollments.completedAt,
    })
    .from(schema.enrollments)
    .innerJoin(
      schema.courses,
      eq(schema.enrollments.courseId, schema.courses.id),
    )
    .where(eq(schema.enrollments.userId, userId));
}

/** Lesson-completion progress for one user in one course. */
export async function courseProgress(userId: string, courseId: string) {
  const lessons = await listLessons(courseId);
  const total = lessons.length;
  const completedLessonIds = new Set<string>();

  if (total > 0 && isUuid(userId)) {
    const rows = await db
      .select({ lessonId: schema.lessonProgress.lessonId })
      .from(schema.lessonProgress)
      .where(
        and(
          eq(schema.lessonProgress.userId, userId),
          inArray(
            schema.lessonProgress.lessonId,
            lessons.map((l) => l.id),
          ),
        ),
      );
    for (const row of rows) completedLessonIds.add(row.lessonId);
  }

  return { total, completed: completedLessonIds.size, completedLessonIds };
}

/** Completed-lesson counts keyed by user, across a set of lessons (one query). */
export async function completionCounts(
  lessonIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (lessonIds.length === 0) return counts;

  const rows = await db
    .select({ userId: schema.lessonProgress.userId })
    .from(schema.lessonProgress)
    .where(inArray(schema.lessonProgress.lessonId, lessonIds));

  for (const row of rows) {
    counts.set(row.userId, (counts.get(row.userId) ?? 0) + 1);
  }
  return counts;
}

/**
 * Recomputes an enrollment's completion: complete when every lesson is done
 * and, if the course has a quiz with questions, that quiz has been passed.
 * Called after a learner finishes a lesson or a quiz attempt.
 */
export async function markCourseCompletion(
  userId: string,
  courseId: string,
): Promise<void> {
  const enrollment = await getEnrollment(userId, courseId);
  if (!enrollment) return;

  const { total, completed } = await courseProgress(userId, courseId);
  const gate = await quizGate(courseId);

  const lessonsDone = completed >= total;
  const quizDone =
    !gate.required ||
    (gate.quiz !== null && (await hasPassedQuiz(userId, gate.quiz.id)));
  const hasContent = total > 0 || gate.required;
  const done = hasContent && lessonsDone && quizDone;

  const completedAt = done ? (enrollment.completedAt ?? new Date()) : null;
  await db
    .update(schema.enrollments)
    .set({ completedAt })
    .where(eq(schema.enrollments.id, enrollment.id));
}

/**
 * Per-course enrollment counts for an org — total assigned and completed.
 * One query (left join, grouped in memory) for the admin/manager dashboard.
 */
export async function listCourseCompletion(orgId: string) {
  const rows = await db
    .select({
      courseId: schema.courses.id,
      title: schema.courses.title,
      published: schema.courses.published,
      enrolledUserId: schema.enrollments.userId,
      completedAt: schema.enrollments.completedAt,
    })
    .from(schema.courses)
    .leftJoin(
      schema.enrollments,
      eq(schema.enrollments.courseId, schema.courses.id),
    )
    .where(eq(schema.courses.orgId, orgId))
    .orderBy(schema.courses.title);

  const byCourse = new Map<
    string,
    {
      courseId: string;
      title: string;
      published: boolean;
      total: number;
      completed: number;
    }
  >();

  for (const row of rows) {
    let entry = byCourse.get(row.courseId);
    if (!entry) {
      entry = {
        courseId: row.courseId,
        title: row.title,
        published: row.published,
        total: 0,
        completed: 0,
      };
      byCourse.set(row.courseId, entry);
    }
    if (row.enrolledUserId) entry.total += 1;
    if (row.completedAt) entry.completed += 1;
  }

  return [...byCourse.values()];
}
