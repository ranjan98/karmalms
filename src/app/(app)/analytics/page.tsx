import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { orgAnalytics } from "@/lib/analytics";
import { ProgressBar } from "@/components/progress-bar";
import { Card, CardContent } from "@/components/ui/card";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <div className="text-muted-foreground text-sm">{label}</div>
      </CardContent>
    </Card>
  );
}

export default async function AnalyticsPage() {
  const user = await requireUser();
  if (user.role === "learner") redirect("/dashboard");

  const a = await orgAnalytics(user.orgId);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Training and compliance across your organization.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Stat label="People" value={a.people} />
        <Stat label="Courses" value={a.courses} />
        <Stat label="Completion rate" value={`${a.completionRate}%`} />
        <Stat
          label="Certs need attention"
          value={a.certHealth.expiring + a.certHealth.expired}
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold">Completion by department</h2>
      <div className="mt-3 overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground bg-muted/50 text-left">
              <th className="px-4 py-2.5 font-medium">Department</th>
              <th className="px-4 py-2.5 font-medium">People</th>
              <th className="px-4 py-2.5 font-medium">Completion</th>
            </tr>
          </thead>
          <tbody>
            {a.departments.map((d) => (
              <tr key={d.name} className="border-t">
                <td className="px-4 py-2.5 font-medium">{d.name}</td>
                <td className="text-muted-foreground px-4 py-2.5">
                  {d.people}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <ProgressBar
                      value={d.completed}
                      total={d.assigned}
                      className="max-w-[10rem]"
                    />
                    <span className="text-muted-foreground text-xs">
                      {d.completed}/{d.assigned}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-lg font-semibold">Certificate health</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <Stat label="Valid" value={a.certHealth.valid} />
        <Stat label="Expiring soon" value={a.certHealth.expiring} />
        <Stat label="Expired" value={a.certHealth.expired} />
      </div>
    </div>
  );
}
