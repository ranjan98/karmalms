import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { createOrg, dropOrg } from "@/test/helpers";
import {
  getEnrollment,
  markCourseCompletion,
  enrollmentCountsByUser,
} from "@/lib/enrollments";

const SLUG = "itest-enrollments";

let orgId: string;
let userId: string;
let courseId: string;
let lessonIds: string[];

beforeAll(async () => {
  orgId = await createOrg(SLUG);

  [{ id: userId }] = await db
    .insert(schema.users)
    .values({
      orgId,
      externalId: "learner-1",
      email: "learner@itest-enrollments.example",
      role: "learner",
    })
    .returning({ id: schema.users.id });

  [{ id: courseId }] = await db
    .insert(schema.courses)
    .values({ orgId, title: "Onboarding", published: true })
    .returning({ id: schema.courses.id });

  const lessons = await db
    .insert(schema.lessons)
    .values([
      { courseId, title: "Lesson 1", position: 0 },
      { courseId, title: "Lesson 2", position: 1 },
    ])
    .returning({ id: schema.lessons.id });
  lessonIds = lessons.map((l) => l.id);

  await db.insert(schema.enrollments).values({ userId, courseId });
});

afterAll(() => dropOrg(SLUG));

describe("course completion (DB)", () => {
  it("stays incomplete until every lesson is done", async () => {
    await db
      .insert(schema.lessonProgress)
      .values({ userId, lessonId: lessonIds[0] });

    await markCourseCompletion(userId, courseId);

    const enrollment = await getEnrollment(userId, courseId);
    expect(enrollment?.completedAt).toBeNull();
  });

  it("completes the enrollment once the last lesson is done", async () => {
    await db
      .insert(schema.lessonProgress)
      .values({ userId, lessonId: lessonIds[1] });

    await markCourseCompletion(userId, courseId);

    const enrollment = await getEnrollment(userId, courseId);
    expect(enrollment?.completedAt).toBeInstanceOf(Date);
  });

  it("aggregates assigned/completed counts per user in one query", async () => {
    const counts = await enrollmentCountsByUser([userId]);
    expect(counts.get(userId)).toEqual({ assigned: 1, completed: 1 });
  });

  it("reverts completion when a lesson's progress is removed", async () => {
    await db
      .delete(schema.lessonProgress)
      .where(eq(schema.lessonProgress.lessonId, lessonIds[1]));

    await markCourseCompletion(userId, courseId);

    const enrollment = await getEnrollment(userId, courseId);
    expect(enrollment?.completedAt).toBeNull();
  });
});
