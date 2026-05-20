/**
 * Certification lapse reminders. Finds certificates that are expiring soon or
 * already expired and haven't been reminded about yet, notifies the holder,
 * and marks the reminder as sent. Idempotent — safe to run on any schedule.
 */
import { and, eq, isNull, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { notify } from "@/lib/notifications";

const REMINDER_WINDOW_DAYS = 30;

export async function sendCertificationReminders(): Promise<number> {
  const cutoff = new Date(
    Date.now() + REMINDER_WINDOW_DAYS * 86_400_000,
  );

  const due = await db
    .select({
      certId: schema.certificates.id,
      email: schema.users.email,
      name: schema.users.name,
      courseTitle: schema.courses.title,
      expiresAt: schema.certificates.expiresAt,
    })
    .from(schema.certificates)
    .innerJoin(schema.users, eq(schema.certificates.userId, schema.users.id))
    .innerJoin(
      schema.courses,
      eq(schema.certificates.courseId, schema.courses.id),
    )
    .where(
      and(
        lte(schema.certificates.expiresAt, cutoff),
        isNull(schema.certificates.reminderSentAt),
      ),
    );

  for (const cert of due) {
    const expired = cert.expiresAt.getTime() <= Date.now();
    const when = cert.expiresAt.toDateString();

    await notify({
      to: cert.email,
      subject: expired
        ? `Your "${cert.courseTitle}" certification has expired`
        : `Your "${cert.courseTitle}" certification expires soon`,
      body:
        `Hi ${cert.name ?? cert.email},\n\n` +
        (expired
          ? `Your certification for "${cert.courseTitle}" expired on ${when}.`
          : `Your certification for "${cert.courseTitle}" expires on ${when}.`) +
        `\n\nPlease retake the course in KarmaLMS to stay compliant.`,
    });

    await db
      .update(schema.certificates)
      .set({ reminderSentAt: new Date() })
      .where(eq(schema.certificates.id, cert.certId));
  }

  return due.length;
}
