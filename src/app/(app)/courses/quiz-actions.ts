"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getCourse } from "@/lib/courses";
import { getQuiz, listQuestions } from "@/lib/quizzes";
import { getEnrollment, markCourseCompletion } from "@/lib/enrollments";

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Error("Admin access is required to manage quizzes.");
  }
  return user;
}

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

/** Resolves the course (admin, org-scoped) and its quiz, throwing if missing. */
async function requireQuiz(formData: FormData) {
  const user = await requireAdmin();
  const courseId = field(formData, "courseId");
  const course = await getCourse(courseId, user.orgId);
  if (!course) throw new Error("Course not found.");
  const quiz = await getQuiz(courseId);
  if (!quiz) throw new Error("Quiz not found.");
  return { courseId, quiz };
}

export async function createQuiz(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const courseId = field(formData, "courseId");
  const course = await getCourse(courseId, user.orgId);
  if (!course) throw new Error("Course not found.");

  await db.insert(schema.quizzes).values({ courseId }).onConflictDoNothing();
  redirect(`/courses/${courseId}/quiz`);
}

export async function updateQuiz(formData: FormData): Promise<void> {
  const { courseId, quiz } = await requireQuiz(formData);

  let passingScore = Number(formData.get("passingScore"));
  if (!Number.isFinite(passingScore)) passingScore = 70;
  passingScore = Math.min(100, Math.max(1, Math.round(passingScore)));

  await db
    .update(schema.quizzes)
    .set({ passingScore })
    .where(eq(schema.quizzes.id, quiz.id));

  revalidatePath(`/courses/${courseId}/quiz`);
}

export async function deleteQuiz(formData: FormData): Promise<void> {
  const { courseId, quiz } = await requireQuiz(formData);
  await db.delete(schema.quizzes).where(eq(schema.quizzes.id, quiz.id));
  redirect(`/courses/${courseId}`);
}

export async function saveQuestion(formData: FormData): Promise<void> {
  const { courseId, quiz } = await requireQuiz(formData);

  const prompt = field(formData, "prompt");
  if (!prompt) throw new Error("A question prompt is required.");

  const options = [0, 1, 2, 3].map((i) => field(formData, `option${i}`));
  if (options.some((o) => !o)) {
    throw new Error("All four answer choices are required.");
  }

  let correctIndex = Number(formData.get("correctIndex"));
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    correctIndex = 0;
  }

  const questionId = field(formData, "questionId");
  if (questionId) {
    await db
      .update(schema.quizQuestions)
      .set({ prompt, options, correctIndex })
      .where(
        and(
          eq(schema.quizQuestions.id, questionId),
          eq(schema.quizQuestions.quizId, quiz.id),
        ),
      );
  } else {
    const existing = await listQuestions(quiz.id);
    await db.insert(schema.quizQuestions).values({
      quizId: quiz.id,
      prompt,
      options,
      correctIndex,
      position: existing.length,
    });
  }

  revalidatePath(`/courses/${courseId}/quiz`);
}

export async function deleteQuestion(formData: FormData): Promise<void> {
  const { courseId, quiz } = await requireQuiz(formData);
  const questionId = field(formData, "questionId");

  await db
    .delete(schema.quizQuestions)
    .where(
      and(
        eq(schema.quizQuestions.id, questionId),
        eq(schema.quizQuestions.quizId, quiz.id),
      ),
    );

  revalidatePath(`/courses/${courseId}/quiz`);
}

/** A learner submits answers — graded against `correctIndex`, recorded as an attempt. */
export async function submitQuiz(formData: FormData): Promise<void> {
  const user = await requireUser();
  const courseId = field(formData, "courseId");

  const course = await getCourse(courseId, user.orgId);
  if (!course) throw new Error("Course not found.");
  const enrollment = await getEnrollment(user.id, courseId);
  if (!enrollment) throw new Error("You are not enrolled in this course.");

  const quiz = await getQuiz(courseId);
  if (!quiz) throw new Error("Quiz not found.");
  const questions = await listQuestions(quiz.id);
  if (questions.length === 0) throw new Error("This quiz has no questions.");

  let correct = 0;
  for (const question of questions) {
    const answer = formData.get(`q_${question.id}`);
    if (answer !== null && Number(answer) === question.correctIndex) {
      correct += 1;
    }
  }

  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= quiz.passingScore;

  await db
    .insert(schema.quizAttempts)
    .values({ userId: user.id, quizId: quiz.id, score, passed });

  await markCourseCompletion(user.id, courseId);
  revalidatePath(`/courses/${courseId}/quiz`);
  revalidatePath(`/courses/${courseId}`);
}
