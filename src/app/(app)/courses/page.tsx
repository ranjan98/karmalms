import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listCourses } from "@/lib/courses";
import { listUserEnrollments, courseProgress } from "@/lib/enrollments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/progress-bar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { createCourse } from "./actions";

export default async function CoursesPage() {
  const user = await requireUser();
  return user.role === "admin" ? (
    <AdminCourses orgId={user.orgId} />
  ) : (
    <LearnerCourses userId={user.id} />
  );
}

async function AdminCourses({ orgId }: { orgId: string }) {
  const courses = await listCourses(orgId, { publishedOnly: false });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Create and manage training courses.
      </p>

      <form action={createCourse} className="mt-6 flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="title">New course</Label>
          <Input
            id="title"
            name="title"
            placeholder="e.g. Security Awareness 2026"
            required
          />
        </div>
        <Button type="submit">Create</Button>
      </form>

      <div className="mt-6 flex flex-col gap-3">
        {courses.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No courses yet — create your first one above.
          </p>
        )}
        {courses.map((course) => (
          <Link key={course.id} href={`/courses/${course.id}`}>
            <Card className="hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{course.title}</CardTitle>
                  <Badge variant={course.published ? "default" : "secondary"}>
                    {course.published ? "Published" : "Draft"}
                  </Badge>
                </div>
                {course.description && (
                  <CardDescription>{course.description}</CardDescription>
                )}
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

async function LearnerCourses({ userId }: { userId: string }) {
  const enrollments = (await listUserEnrollments(userId)).filter(
    (e) => e.published,
  );
  const courses = await Promise.all(
    enrollments.map(async (e) => {
      const { total, completed } = await courseProgress(userId, e.courseId);
      return { ...e, total, completed };
    }),
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">My courses</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Training assigned to you.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {courses.length === 0 && (
          <p className="text-muted-foreground text-sm">
            You have no courses assigned yet.
          </p>
        )}
        {courses.map((course) => (
          <Link key={course.courseId} href={`/courses/${course.courseId}`}>
            <Card className="hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{course.title}</CardTitle>
                  {course.completedAt && <Badge>Completed</Badge>}
                </div>
                {course.description && (
                  <CardDescription>{course.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <ProgressBar value={course.completed} total={course.total} />
                <p className="text-muted-foreground mt-1.5 text-xs">
                  {course.completed} of {course.total} lessons complete
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
