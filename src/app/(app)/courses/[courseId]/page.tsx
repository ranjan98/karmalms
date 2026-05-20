import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCourse, listLessons } from "@/lib/courses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
        <LearnerCourse course={course} lessons={lessons} />
      )}
    </div>
  );
}

function AdminCourse({ course, lessons }: { course: Course; lessons: Lesson[] }) {
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
            <div>
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <h2 className="mt-8 text-lg font-semibold">Lessons</h2>
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

function LearnerCourse({
  course,
  lessons,
}: {
  course: Course;
  lessons: Lesson[];
}) {
  return (
    <>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        {course.title}
      </h1>
      {course.description && (
        <p className="text-muted-foreground mt-2">{course.description}</p>
      )}

      <h2 className="mt-8 text-lg font-semibold">Lessons</h2>
      <div className="mt-3 flex flex-col gap-2">
        {lessons.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No lessons in this course yet.
          </p>
        )}
        {lessons.map((lesson, i) => (
          <Link
            key={lesson.id}
            href={`/courses/${course.id}/lessons/${lesson.id}`}
            className="hover:border-primary flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors"
          >
            <span className="text-muted-foreground w-5 tabular-nums">
              {i + 1}
            </span>
            <span className="font-medium">{lesson.title}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
