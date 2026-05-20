/**
 * Course certificates — issued on completion, with an expiry date so the
 * compliance views can flag training that's lapsing or lapsed.
 */
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { isUuid } from "@/lib/courses";

export type CertStatus = "valid" | "expiring" | "expired";

const DAY_MS = 86_400_000;
const EXPIRING_WINDOW_DAYS = 30;

/** Classifies a certificate by how close it is to expiry. */
export function certStatus(expiresAt: Date): CertStatus {
  const remaining = expiresAt.getTime() - Date.now();
  if (remaining <= 0) return "expired";
  if (remaining <= EXPIRING_WINDOW_DAYS * DAY_MS) return "expiring";
  return "valid";
}

/**
 * Issues or revokes a course certificate to match completion state. Called
 * from markCourseCompletion. A no-op for courses without a certificate
 * program. An issued certificate is not refreshed until a retake clears it.
 */
export async function syncCertificate(
  userId: string,
  courseId: string,
  completed: boolean,
): Promise<void> {
  const [course] = await db
    .select({ validityDays: schema.courses.certificateValidityDays })
    .from(schema.courses)
    .where(eq(schema.courses.id, courseId))
    .limit(1);

  const validityDays = course?.validityDays ?? null;
  if (validityDays == null) return; // no certificate program

  const [existing] = await db
    .select({ id: schema.certificates.id })
    .from(schema.certificates)
    .where(
      and(
        eq(schema.certificates.userId, userId),
        eq(schema.certificates.courseId, courseId),
      ),
    )
    .limit(1);

  if (!completed) {
    if (existing) {
      await db
        .delete(schema.certificates)
        .where(eq(schema.certificates.id, existing.id));
    }
    return;
  }

  if (existing) return; // already issued — leave its dates intact

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + validityDays * DAY_MS);
  await db
    .insert(schema.certificates)
    .values({ userId, courseId, issuedAt, expiresAt })
    .onConflictDoNothing();
}

/** A learner's certificates, joined with the course. */
export async function listUserCertificates(userId: string) {
  if (!isUuid(userId)) return [];
  return db
    .select({
      courseId: schema.courses.id,
      courseTitle: schema.courses.title,
      issuedAt: schema.certificates.issuedAt,
      expiresAt: schema.certificates.expiresAt,
    })
    .from(schema.certificates)
    .innerJoin(
      schema.courses,
      eq(schema.certificates.courseId, schema.courses.id),
    )
    .where(eq(schema.certificates.userId, userId))
    .orderBy(schema.certificates.expiresAt);
}

/** Every certificate in an org — the admin/manager compliance view. */
export async function listOrgCertificates(orgId: string) {
  return db
    .select({
      userName: schema.users.name,
      userEmail: schema.users.email,
      courseTitle: schema.courses.title,
      issuedAt: schema.certificates.issuedAt,
      expiresAt: schema.certificates.expiresAt,
    })
    .from(schema.certificates)
    .innerJoin(
      schema.courses,
      eq(schema.certificates.courseId, schema.courses.id),
    )
    .innerJoin(schema.users, eq(schema.certificates.userId, schema.users.id))
    .where(eq(schema.courses.orgId, orgId))
    .orderBy(schema.certificates.expiresAt);
}

/** Certificates held by a manager's direct reports — the team compliance view. */
export async function listTeamCertificates(managerId: string) {
  if (!isUuid(managerId)) return [];
  return db
    .select({
      userName: schema.users.name,
      userEmail: schema.users.email,
      courseTitle: schema.courses.title,
      issuedAt: schema.certificates.issuedAt,
      expiresAt: schema.certificates.expiresAt,
    })
    .from(schema.certificates)
    .innerJoin(
      schema.courses,
      eq(schema.certificates.courseId, schema.courses.id),
    )
    .innerJoin(schema.users, eq(schema.certificates.userId, schema.users.id))
    .where(eq(schema.users.managerId, managerId))
    .orderBy(schema.certificates.expiresAt);
}
