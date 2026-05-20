/**
 * Quiz queries — one optional quiz per course, with inline-choice questions
 * and per-learner attempts.
 */
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { isUuid } from "@/lib/courses";

export async function getQuiz(courseId: string) {
  if (!isUuid(courseId)) return null;
  const [quiz] = await db
    .select()
    .from(schema.quizzes)
    .where(eq(schema.quizzes.courseId, courseId))
    .limit(1);
  return quiz ?? null;
}

export async function listQuestions(quizId: string) {
  if (!isUuid(quizId)) return [];
  return db
    .select()
    .from(schema.quizQuestions)
    .where(eq(schema.quizQuestions.quizId, quizId))
    .orderBy(asc(schema.quizQuestions.position));
}

export async function latestAttempt(userId: string, quizId: string) {
  if (!isUuid(userId) || !isUuid(quizId)) return null;
  const [attempt] = await db
    .select()
    .from(schema.quizAttempts)
    .where(
      and(
        eq(schema.quizAttempts.userId, userId),
        eq(schema.quizAttempts.quizId, quizId),
      ),
    )
    .orderBy(desc(schema.quizAttempts.createdAt))
    .limit(1);
  return attempt ?? null;
}

export async function hasPassedQuiz(
  userId: string,
  quizId: string,
): Promise<boolean> {
  if (!isUuid(userId) || !isUuid(quizId)) return false;
  const [attempt] = await db
    .select({ id: schema.quizAttempts.id })
    .from(schema.quizAttempts)
    .where(
      and(
        eq(schema.quizAttempts.userId, userId),
        eq(schema.quizAttempts.quizId, quizId),
        eq(schema.quizAttempts.passed, true),
      ),
    )
    .limit(1);
  return Boolean(attempt);
}

/**
 * A course's quiz and whether it gates completion — `required` is true only
 * once the quiz actually has questions.
 */
export async function quizGate(courseId: string) {
  const quiz = await getQuiz(courseId);
  if (!quiz) return { quiz: null, required: false };
  const questions = await listQuestions(quiz.id);
  return { quiz, required: questions.length > 0 };
}

/** Normalizes the jsonb `options` column to a string array. */
export function questionOptions(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => String(v)) : [];
}
