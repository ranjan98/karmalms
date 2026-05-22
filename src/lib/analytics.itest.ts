import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db, schema } from "@/db";
import { createOrg, dropOrg } from "@/test/helpers";
import { orgAnalytics } from "@/lib/analytics";

const SLUG = "itest-analytics";

let orgId: string;

beforeAll(async () => {
  orgId = await createOrg(SLUG);

  // Three people: two in Engineering, one with no department.
  const users = await db
    .insert(schema.users)
    .values([
      {
        orgId,
        externalId: "u-1",
        email: "ann@itest-analytics.example",
        department: "Engineering",
        role: "learner",
      },
      {
        orgId,
        externalId: "u-2",
        email: "ben@itest-analytics.example",
        department: "Engineering",
        role: "learner",
      },
      {
        orgId,
        externalId: "u-3",
        email: "cleo@itest-analytics.example",
        role: "learner",
      },
    ])
    .returning({ id: schema.users.id });

  const courses = await db
    .insert(schema.courses)
    .values([
      { orgId, title: "Security Basics", certificateValidityDays: 365 },
      { orgId, title: "Code of Conduct" },
    ])
    .returning({ id: schema.courses.id });

  const now = new Date();
  await db.insert(schema.enrollments).values([
    // Course 1: Ann + Cleo complete it, Ben is assigned but unfinished.
    { userId: users[0].id, courseId: courses[0].id, completedAt: now },
    { userId: users[1].id, courseId: courses[0].id },
    { userId: users[2].id, courseId: courses[0].id, completedAt: now },
    // Course 2: Ann is assigned, unfinished.
    { userId: users[0].id, courseId: courses[1].id },
  ]);

  // Ann holds a still-valid certificate for the security course.
  await db.insert(schema.certificates).values({
    userId: users[0].id,
    courseId: courses[0].id,
    expiresAt: new Date(Date.now() + 200 * 86_400_000),
  });
});

afterAll(() => dropOrg(SLUG));

describe("orgAnalytics (DB)", () => {
  it("rolls up org-wide headline numbers", async () => {
    const a = await orgAnalytics(orgId);
    expect(a.people).toBe(3);
    expect(a.courses).toBe(2);
    expect(a.totalAssigned).toBe(4);
    expect(a.totalCompleted).toBe(2);
    expect(a.completionRate).toBe(50);
  });

  it("breaks completion down by department", async () => {
    const a = await orgAnalytics(orgId);
    const eng = a.departments.find((d) => d.name === "Engineering");
    const none = a.departments.find((d) => d.name === "Unassigned");

    expect(eng).toEqual({
      name: "Engineering",
      people: 2,
      assigned: 3,
      completed: 1,
    });
    expect(none).toEqual({
      name: "Unassigned",
      people: 1,
      assigned: 1,
      completed: 1,
    });
  });

  it("counts certificate health", async () => {
    const a = await orgAnalytics(orgId);
    expect(a.certHealth).toEqual({ valid: 1, expiring: 0, expired: 0 });
  });
});
