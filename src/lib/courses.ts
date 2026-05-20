/**
 * Read queries for courses and lessons. Writes live in the route's
 * `actions.ts` (server actions). Everything is scoped to an org.
 */
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Guards Postgres against a non-UUID id from a URL param. */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function listCourses(
  orgId: string,
  opts: { publishedOnly: boolean },
) {
  const filters = [eq(schema.courses.orgId, orgId)];
  if (opts.publishedOnly) filters.push(eq(schema.courses.published, true));

  return db
    .select()
    .from(schema.courses)
    .where(and(...filters))
    .orderBy(asc(schema.courses.title));
}

export async function getCourse(courseId: string, orgId: string) {
  if (!isUuid(courseId)) return null;
  const [course] = await db
    .select()
    .from(schema.courses)
    .where(
      and(eq(schema.courses.id, courseId), eq(schema.courses.orgId, orgId)),
    )
    .limit(1);
  return course ?? null;
}

export async function listLessons(courseId: string) {
  if (!isUuid(courseId)) return [];
  return db
    .select()
    .from(schema.lessons)
    .where(eq(schema.lessons.courseId, courseId))
    .orderBy(asc(schema.lessons.position));
}

export async function getLesson(lessonId: string, courseId: string) {
  if (!isUuid(lessonId) || !isUuid(courseId)) return null;
  const [lesson] = await db
    .select()
    .from(schema.lessons)
    .where(
      and(
        eq(schema.lessons.id, lessonId),
        eq(schema.lessons.courseId, courseId),
      ),
    )
    .limit(1);
  return lesson ?? null;
}

/** Lesson content is stored as `{ body: string }` in the jsonb column. */
export function lessonBody(content: unknown): string {
  return (content as { body?: string } | null)?.body ?? "";
}
