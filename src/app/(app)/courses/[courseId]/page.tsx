import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  CheckCircle2,
  Circle,
  Sparkles,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCourse, listLessons } from "@/lib/courses";
import { llm } from "@/lib/llm";
import {
  listCourseEnrollments,
  listOrgUsers,
  completionCounts,
  getEnrollment,
  courseProgress,
} from "@/lib/enrollments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/progress-bar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ConfirmButton } from "@/components/confirm-button";
import {
  updateCourse,
  deleteCourse,
  createLesson,
  deleteLesson,
  moveLesson,
  assignCourse,
  unassignCourse,
  retakeCourse,
} from "../actions";

type Course = NonNullable<Awaited<ReturnType<typeof getCourse>>>;
type Lesson = Awaited<ReturnType<typeof listLessons>>[number];

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const user = await requireUser();
  const isAdmin = user.role === "admin";

  const course = await getCourse(courseId, user.orgId);
  if (!course) notFound();
  if (!isAdmin && !course.published) notFound();

  const lessons = await listLessons(courseId);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/courses"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Courses
      </Link>
      {isAdmin ? (
        <AdminCourse course={course} lessons={lessons} />
      ) : (
        <LearnerCourse
          course={course}
          lessons={lessons}
          userId={user.id}
        />
      )}
    </div>
  );
}

async function AdminCourse({
  course,
  lessons,
}: {
  course: Course;
  lessons: Lesson[];
}) {
  const enrollments = await listCourseEnrollments(course.id);
  const orgUsers = await listOrgUsers(course.orgId);
  const counts = await completionCounts(lessons.map((l) => l.id));

  const enrolledIds = new Set(enrollments.map((e) => e.userId));
  const unassigned = orgUsers.filter((u) => !enrolledIds.has(u.id));

  return (
    <>
      <div className="mt-3 flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {course.title}
        </h1>
        <Badge variant={course.published ? "default" : "secondary"}>
          {course.published ? "Published" : "Draft"}
        </Badge>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Course details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateCourse} className="flex flex-col gap-4">
            <input type="hidden" name="courseId" value={course.id} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={course.title}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={course.description ?? ""}
                rows={3}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="published"
                defaultChecked={course.published}
                className="size-4"
              />
              Published — visible to learners
            </label>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="certificateValidityDays">
                Certificate validity (days)
              </Label>
              <Input
                id="certificateValidityDays"
                name="certificateValidityDays"
                type="number"
                min={1}
                defaultValue={course.certificateValidityDays ?? ""}
                placeholder="Leave blank for no certificate"
                className="max-w-xs"
              />
            </div>
            <div>
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lessons</h2>
        {llm.enabled && (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/courses/${course.id}/generate`}>
              <Sparkles /> Generate with AI
            </Link>
          </Button>
        )}
      </div>
      <form action={createLesson} className="mt-3 flex items-end gap-2">
        <input type="hidden" name="courseId" value={course.id} />
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="lessonTitle">Add a lesson</Label>
          <Input
            id="lessonTitle"
            name="title"
            placeholder="Lesson title"
            required
          />
        </div>
        <Button type="submit">Add</Button>
      </form>

      <div className="mt-4 flex flex-col gap-2">
        {lessons.length === 0 && (
          <p className="text-muted-foreground text-sm">No lessons yet.</p>
        )}
        {lessons.map((lesson, i) => (
          <div
            key={lesson.id}
            className="flex items-center gap-2 rounded-md border px-3 py-2"
          >
            <span className="text-muted-foreground w-5 text-sm tabular-nums">
              {i + 1}
            </span>
            <Link
              href={`/courses/${course.id}/lessons/${lesson.id}`}
              className="flex-1 text-sm font-medium hover:underline"
            >
              {lesson.title}
            </Link>
            <form action={moveLesson}>
              <input type="hidden" name="courseId" value={course.id} />
              <input type="hidden" name="lessonId" value={lesson.id} />
              <input type="hidden" name="direction" value="up" />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                disabled={i === 0}
                aria-label="Move lesson up"
              >
                <ChevronUp />
              </Button>
            </form>
            <form action={moveLesson}>
              <input type="hidden" name="courseId" value={course.id} />
              <input type="hidden" name="lessonId" value={lesson.id} />
              <input type="hidden" name="direction" value="down" />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                disabled={i === lessons.length - 1}
                aria-label="Move lesson down"
              >
                <ChevronDown />
              </Button>
            </form>
            <form action={deleteLesson}>
              <input type="hidden" name="courseId" value={course.id} />
              <input type="hidden" name="lessonId" value={lesson.id} />
              <ConfirmButton
                type="submit"
                variant="ghost"
                size="icon"
                aria-label="Delete lesson"
                confirmText={`Delete the lesson "${lesson.title}"?`}
              >
                <Trash2 />
              </ConfirmButton>
            </form>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-semibold">Quiz</h2>
      <Link
        href={`/courses/${course.id}/quiz`}
        className="hover:border-primary mt-3 flex items-center rounded-md border px-3 py-2.5 text-sm font-medium transition-colors"
      >
        Manage the course quiz →
      </Link>

      <h2 className="mt-8 text-lg font-semibold">People</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Assign this course and track who has completed it.
      </p>

      {unassigned.length > 0 ? (
        <form action={assignCourse} className="mt-3 flex items-end gap-2">
          <input type="hidden" name="courseId" value={course.id} />
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="assignUser">Assign a person</Label>
            <select
              id="assignUser"
              name="userId"
              required
              className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none"
            >
              {unassigned.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.email} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">Assign</Button>
        </form>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm">
          Everyone in your organization is assigned.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {enrollments.length === 0 && (
          <p className="text-muted-foreground text-sm">No one assigned yet.</p>
        )}
        {enrollments.map((e) => {
          const done = counts.get(e.userId) ?? 0;
          return (
            <div
              key={e.userId}
              className="flex items-center gap-3 rounded-md border px-3 py-2"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {e.userName ?? e.userEmail}
                </p>
                <p className="text-muted-foreground text-xs">{e.userEmail}</p>
              </div>
              {e.completedAt ? (
                <Badge>Completed</Badge>
              ) : (
                <span className="text-muted-foreground text-xs">
                  {done} / {lessons.length} lessons
                </span>
              )}
              <form action={unassignCourse}>
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="userId" value={e.userId} />
                <ConfirmButton
                  type="submit"
                  variant="ghost"
                  size="icon"
                  aria-label="Unassign"
                  confirmText={`Remove ${e.userName ?? e.userEmail} from this course?`}
                >
                  <Trash2 />
                </ConfirmButton>
              </form>
            </div>
          );
        })}
      </div>

      <Card className="border-destructive/40 mt-8">
        <CardHeader>
          <CardTitle className="text-base">Delete course</CardTitle>
          <CardDescription>
            Removes the course and all its lessons. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={deleteCourse}>
            <input type="hidden" name="courseId" value={course.id} />
            <ConfirmButton
              type="submit"
              variant="destructive"
              confirmText={`Delete "${course.title}" and all its lessons?`}
            >
              Delete course
            </ConfirmButton>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

async function LearnerCourse({
  course,
  lessons,
  userId,
}: {
  course: Course;
  lessons: Lesson[];
  userId: string;
}) {
  const enrollment = await getEnrollment(userId, course.id);
  const { completed, completedLessonIds } = await courseProgress(
    userId,
    course.id,
  );

  return (
    <>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        {course.title}
      </h1>
      {course.description && (
        <p className="text-muted-foreground mt-2">{course.description}</p>
      )}

      {enrollment && (
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <ProgressBar
              value={completed}
              total={lessons.length}
              className="max-w-xs"
            />
            <span className="text-muted-foreground text-xs">
              {completed} / {lessons.length}
            </span>
            {enrollment.completedAt && <Badge>Completed</Badge>}
          </div>
        </div>
      )}

      {enrollment?.completedAt && (
        <form action={retakeCourse} className="mt-3">
          <input type="hidden" name="courseId" value={course.id} />
          <ConfirmButton
            type="submit"
            variant="outline"
            size="sm"
            confirmText="Retake this course? Your progress is cleared so you can complete it again."
          >
            Retake course
          </ConfirmButton>
        </form>
      )}

      <h2 className="mt-8 text-lg font-semibold">Lessons</h2>
      <div className="mt-3 flex flex-col gap-2">
        {lessons.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No lessons in this course yet.
          </p>
        )}
        {lessons.map((lesson, i) => {
          const isDone = completedLessonIds.has(lesson.id);
          return (
            <Link
              key={lesson.id}
              href={`/courses/${course.id}/lessons/${lesson.id}`}
              className="hover:border-primary flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors"
            >
              {enrollment &&
                (isDone ? (
                  <CheckCircle2 className="text-primary size-4" />
                ) : (
                  <Circle className="text-muted-foreground size-4" />
                ))}
              <span className="text-muted-foreground w-5 tabular-nums">
                {i + 1}
              </span>
              <span className="font-medium">{lesson.title}</span>
            </Link>
          );
        })}
      </div>

      <h2 className="mt-8 text-lg font-semibold">Quiz</h2>
      <Link
        href={`/courses/${course.id}/quiz`}
        className="hover:border-primary mt-3 flex items-center rounded-md border px-3 py-2.5 text-sm font-medium transition-colors"
      >
        Open the course quiz →
      </Link>
    </>
  );
}
