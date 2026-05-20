import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listOrgUsers, listUserEnrollments } from "@/lib/enrollments";
import { Badge } from "@/components/ui/badge";

export default async function PeoplePage() {
  const user = await requireUser();
  // People is a manager/admin view; learners have no business here.
  if (user.role === "learner") redirect("/dashboard");

  const users = await listOrgUsers(user.orgId);
  const rows = await Promise.all(
    users.map(async (u) => {
      const enrollments = await listUserEnrollments(u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        assigned: enrollments.length,
        completed: enrollments.filter((e) => e.completedAt).length,
      };
    }),
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">People</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Everyone in your organization and their training progress.
      </p>

      <div className="mt-6 overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground bg-muted/50 text-left">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Courses completed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2.5">
                  <div className="font-medium">{r.name ?? r.email}</div>
                  <div className="text-muted-foreground text-xs">
                    {r.email}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="secondary" className="capitalize">
                    {r.role}
                  </Badge>
                </td>
                <td className="text-muted-foreground px-4 py-2.5">
                  {r.completed} of {r.assigned}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
