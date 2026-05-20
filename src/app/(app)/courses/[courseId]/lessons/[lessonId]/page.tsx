import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCourse, getLesson, lessonBody } from "@/lib/courses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateLesson } from "../../../actions";

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

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href={`/courses/${courseId}`}
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← {course.title}
      </Link>

      {isAdmin ? (
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
            <Label htmlFor="body">Content</Label>
            <Textarea
              id="body"
              name="body"
              defaultValue={body}
              rows={16}
              placeholder="Write the lesson content here…"
            />
          </div>
          <div>
            <Button type="submit">Save lesson</Button>
          </div>
        </form>
      ) : (
        <article className="mt-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            {lesson.title}
          </h1>
          <div className="mt-4 leading-relaxed whitespace-pre-wrap">
            {body || (
              <span className="text-muted-foreground">
                This lesson has no content yet.
              </span>
            )}
          </div>
        </article>
      )}
    </div>
  );
}
