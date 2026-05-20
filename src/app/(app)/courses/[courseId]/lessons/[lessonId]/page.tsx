import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCourse, getLesson, lessonBody } from "@/lib/courses";
import { getEnrollment, courseProgress } from "@/lib/enrollments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/markdown";
import { updateLesson, completeLesson, uncompleteLesson } from "../../../actions";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const user = await requireUser();
  const isAdmin = user.role === "admin";

  const course = await getCourse(courseId, user.orgId);
  if (!course) notFound();
  if (!isAdmin && !course.published) notFound();

  const lesson = await getLesson(lessonId, courseId);
  if (!lesson) notFound();

  const body = lessonBody(lesson.content);

  if (isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href={`/courses/${courseId}`}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← {course.title}
        </Link>
        <form action={updateLesson} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="lessonId" value={lessonId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Lesson title</Label>
            <Input
              id="title"
              name="title"
              defaultValue={lesson.title}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="body">
              Content
              <span className="text-muted-foreground font-normal">
                — Markdown supported
              </span>
            </Label>
            <Textarea
              id="body"
              name="body"
              defaultValue={body}
              rows={16}
              placeholder="Write the lesson content in Markdown…"
            />
          </div>
          <div>
            <Button type="submit">Save lesson</Button>
          </div>
        </form>
      </div>
    );
  }

  // Learner view — show content and, when enrolled, a completion control.
  const enrollment = await getEnrollment(user.id, courseId);
  const { completedLessonIds } = enrollment
    ? await courseProgress(user.id, courseId)
    : { completedLessonIds: new Set<string>() };
  const isDone = completedLessonIds.has(lessonId);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href={`/courses/${courseId}`}
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← {course.title}
      </Link>

      <article className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {lesson.title}
        </h1>
        {body ? (
          <Markdown className="mt-4">{body}</Markdown>
        ) : (
          <p className="text-muted-foreground mt-4 text-sm">
            This lesson has no content yet.
          </p>
        )}
      </article>

      {enrollment && (
        <div className="mt-8 border-t pt-6">
          {isDone ? (
            <div className="flex items-center gap-3">
              <span className="text-primary flex items-center gap-1.5 text-sm font-medium">
                <CheckCircle2 className="size-4" /> Completed
              </span>
              <form action={uncompleteLesson}>
                <input type="hidden" name="courseId" value={courseId} />
                <input type="hidden" name="lessonId" value={lessonId} />
                <Button type="submit" variant="outline" size="sm">
                  Mark as not done
                </Button>
              </form>
            </div>
          ) : (
            <form action={completeLesson}>
              <input type="hidden" name="courseId" value={courseId} />
              <input type="hidden" name="lessonId" value={lessonId} />
              <Button type="submit">Mark as complete</Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
