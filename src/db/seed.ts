/**
 * Seeds a demo organization so a fresh `docker compose up` shows a working
 * instance instead of an empty database.
 *
 *   npm run db:migrate   # apply the schema first
 *   npm run db:seed      # then load this demo data
 *
 * Re-running is safe: it deletes the demo org (cascading to its data) and
 * recreates it from scratch.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "./index";

const DEMO_SLUG = "acme";

async function main() {
  console.log("Seeding KarmaLMS demo data…");

  // Clean slate — cascades to users, courses, lessons, enrollments, progress.
  await db.delete(schema.orgs).where(eq(schema.orgs.slug, DEMO_SLUG));

  const [org] = await db
    .insert(schema.orgs)
    .values({ name: "Acme Inc.", slug: DEMO_SLUG })
    .returning();

  // Users carry no passwords — `externalId` is what the IdP would supply.
  const [admin, manager, learner] = await db
    .insert(schema.users)
    .values([
      {
        orgId: org.id,
        externalId: "seed-admin",
        email: "admin@acme.test",
        name: "Avery Admin",
        role: "admin",
      },
      {
        orgId: org.id,
        externalId: "seed-manager",
        email: "manager@acme.test",
        name: "Morgan Manager",
        role: "manager",
      },
      {
        orgId: org.id,
        externalId: "seed-learner",
        email: "learner@acme.test",
        name: "Lee Learner",
        role: "learner",
      },
    ])
    .returning();

  const [course] = await db
    .insert(schema.courses)
    .values({
      orgId: org.id,
      title: "Security Awareness 2026",
      description: "Annual security training required for all employees.",
      published: true,
      createdBy: admin.id,
    })
    .returning();

  const lessons = await db
    .insert(schema.lessons)
    .values([
      {
        courseId: course.id,
        title: "Phishing & Social Engineering",
        position: 0,
        content: { blocks: ["How to spot and report phishing attempts."] },
      },
      {
        courseId: course.id,
        title: "Passwords & Multi-Factor Auth",
        position: 1,
        content: { blocks: ["Strong passwords, password managers, and MFA."] },
      },
      {
        courseId: course.id,
        title: "Handling Sensitive Data",
        position: 2,
        content: { blocks: ["Classifying and protecting company data."] },
      },
    ])
    .returning();

  // Enroll the learner and the manager; the learner has finished lesson 1.
  await db.insert(schema.enrollments).values([
    { userId: learner.id, courseId: course.id },
    { userId: manager.id, courseId: course.id },
  ]);

  await db
    .insert(schema.lessonProgress)
    .values({ userId: learner.id, lessonId: lessons[0].id });

  console.log(`✓ Org "${org.name}" (/${org.slug})`);
  console.log(`✓ 3 users — admin / manager / learner @acme.test`);
  console.log(`✓ Course "${course.title}" with ${lessons.length} lessons`);
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
