import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCourse } from "@/lib/courses";
import { llm } from "@/lib/llm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateCourseContent } from "./actions";

export default async function GeneratePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const user = await requireUser();
  if (user.role !== "admin") notFound();

  const course = await getCourse(courseId, user.orgId);
  if (!course) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href={`/courses/${courseId}`}
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← {course.title}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Generate with AI
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Paste a source document — a policy, handbook, or notes — and AI will
        draft lessons and a quiz, appended to this course for you to review
        and edit.
      </p>

      {llm.enabled ? (
        <form
          action={generateCourseContent}
          className="mt-6 flex flex-col gap-4"
        >
          <input type="hidden" name="courseId" value={courseId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="document">Source document</Label>
            <Textarea
              id="document"
              name="document"
              rows={16}
              required
              placeholder="Paste the source material here…"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit">Generate lessons &amp; quiz</Button>
            <span className="text-muted-foreground text-xs">
              This can take up to a minute.
            </span>
          </div>
        </form>
      ) : (
        <p className="bg-muted text-muted-foreground mt-6 rounded-md p-4 text-sm">
          AI is not configured. Set <code>LLM_MODE</code> (to <code>bedrock</code>{" "}
          or <code>openai</code>) and the matching credentials in the
          environment to enable course generation.
        </p>
      )}
    </div>
  );
}
