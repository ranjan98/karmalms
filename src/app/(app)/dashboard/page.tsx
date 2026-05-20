import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  listUserEnrollments,
  courseProgress,
  listCourseCompletion,
  listOrgUsers,
  listReports,
} from "@/lib/enrollments";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/progress-bar";
import { Card, CardContent } from "@/components/ui/card";

export default async function DashboardPage() {
  const user = await requireUser();
  const name = user.name ?? user.email;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <p className="text-primary text-sm font-semibold">Dashboard</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Welcome, {name}
      </h1>

      {user.role === "learner" ? (
        <LearnerDashboard userId={user.id} />
      ) : user.role === "manager" ? (
        <ManagerDashboard managerId={user.id} />
      ) : (
        <AdminDashboard orgId={user.orgId} />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <div className="text-muted-foreground text-sm">{label}</div>
        {hint && (
          <div className="text-muted-foreground mt-0.5 text-xs">{hint}</div>
        )}
      </CardContent>
    </Card>
  );
}

async function LearnerDashboard({ userId }: { userId: string }) {
  const enrollments = (await listUserEnrollments(userId)).filter(
    (e) => e.published,
  );
  const courses = await Promise.all(
    enrollments.map(async (e) => {
      const { total, completed } = await courseProgress(userId, e.courseId);
      return { ...e, total, completed };
    }),
  );
  const completed = courses.filter((c) => c.completedAt).length;
  const inProgress = courses.filter((c) => !c.completedAt);

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Courses assigned" value={courses.length} />
        <Stat label="Completed" value={completed} />
        <Stat label="In progress" value={inProgress.length} />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Continue learning</h2>
        <Button asChild variant="ghost" size="sm">
          <Link href="/courses">All courses</Link>
        </Button>
      </div>

      {courses.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-sm">
          You have no courses assigned yet.
        </p>
      ) : inProgress.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-sm">
          You&apos;ve completed everything assigned. Nice work. 🎉
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {inProgress.map((course) => (
            <Link key={course.courseId} href={`/courses/${course.courseId}`}>
              <Card className="hover:border-primary transition-colors">
                <CardContent>
                  <div className="font-medium">{course.title}</div>
                  <ProgressBar
                    value={course.completed}
                    total={course.total}
                    className="mt-2"
                  />
                  <p className="text-muted-foreground mt-1.5 text-xs">
                    {course.completed} of {course.total} lessons complete
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

async function AdminDashboard({ orgId }: { orgId: string }) {
  const completion = await listCourseCompletion(orgId);
  const people = await listOrgUsers(orgId);

  const published = completion.filter((c) => c.published).length;
  const totalEnrollments = completion.reduce((sum, c) => sum + c.total, 0);
  const totalCompleted = completion.reduce((sum, c) => sum + c.completed, 0);
  const rate =
    totalEnrollments > 0
      ? Math.round((totalCompleted / totalEnrollments) * 100)
      : 0;

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Courses"
          value={completion.length}
          hint={`${published} published`}
        />
        <Stat label="People" value={people.length} />
        <Stat
          label="Completion rate"
          value={`${rate}%`}
          hint={`${totalCompleted} of ${totalEnrollments} enrollments`}
        />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Course completion</h2>
        <Button asChild variant="ghost" size="sm">
          <Link href="/courses">Manage courses</Link>
        </Button>
      </div>

      {completion.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-sm">No courses yet.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {completion.map((course) => (
            <Link key={course.courseId} href={`/courses/${course.courseId}`}>
              <Card className="hover:border-primary transition-colors">
                <CardContent>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{course.title}</span>
                    <span className="text-muted-foreground text-xs">
                      {course.completed} / {course.total} completed
                    </span>
                  </div>
                  <ProgressBar
                    value={course.completed}
                    total={course.total}
                    className="mt-2"
                  />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

async function ManagerDashboard({ managerId }: { managerId: string }) {
  const reports = await listReports(managerId);
  const rows = await Promise.all(
    reports.map(async (r) => {
      const enrollments = await listUserEnrollments(r.id);
      return {
        id: r.id,
        name: r.name ?? r.email,
        assigned: enrollments.length,
        completed: enrollments.filter((e) => e.completedAt).length,
      };
    }),
  );

  const totalAssigned = rows.reduce((s, r) => s + r.assigned, 0);
  const totalCompleted = rows.reduce((s, r) => s + r.completed, 0);
  const rate =
    totalAssigned > 0
      ? Math.round((totalCompleted / totalAssigned) * 100)
      : 0;

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Team size" value={rows.length} />
        <Stat
          label="Courses completed"
          value={totalCompleted}
          hint={`of ${totalAssigned} assigned`}
        />
        <Stat label="Completion rate" value={`${rate}%`} />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your team</h2>
        <Button asChild variant="ghost" size="sm">
          <Link href="/people">People</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-sm">
          No one reports to you yet — an admin sets reporting lines on the
          People page.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {r.completed} / {r.assigned} completed
                  </span>
                </div>
                <ProgressBar
                  value={r.completed}
                  total={r.assigned}
                  className="mt-2"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
