import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  listOrgUsers,
  listReports,
  enrollmentCountsByUser,
} from "@/lib/enrollments";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/confirm-button";
import { RoleSelect } from "./role-select";
import { ManagerSelect } from "./manager-select";
import { forceSignOut } from "./actions";

type OrgUser = Awaited<ReturnType<typeof listOrgUsers>>[number];

async function withStats(users: OrgUser[]) {
  const counts = await enrollmentCountsByUser(users.map((u) => u.id));
  return users.map((u) => {
    const c = counts.get(u.id) ?? { assigned: 0, completed: 0 };
    return { ...u, assigned: c.assigned, completed: c.completed };
  });
}

export default async function PeoplePage() {
  const user = await requireUser();
  if (user.role === "learner") redirect("/dashboard");

  return user.role === "admin" ? (
    <AdminPeople orgId={user.orgId} currentUserId={user.id} />
  ) : (
    <ManagerPeople managerId={user.id} />
  );
}

async function AdminPeople({
  orgId,
  currentUserId,
}: {
  orgId: string;
  currentUserId: string;
}) {
  const users = await listOrgUsers(orgId);
  const rows = await withStats(users);
  const managerOptions = users
    .filter((u) => u.role === "admin" || u.role === "manager")
    .map((u) => ({ id: u.id, label: u.name ?? u.email }));

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">People</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Everyone in your organization. Set roles and reporting lines with the
        dropdowns.
      </p>

      <div className="mt-6 overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground bg-muted/50 text-left">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Manager</th>
              <th className="px-4 py-2.5 font-medium">Courses</th>
              <th className="px-4 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.name ?? r.email}</span>
                    {!r.active && <Badge variant="secondary">Inactive</Badge>}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {r.email}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <RoleSelect
                    userId={r.id}
                    role={r.role}
                    disabled={r.id === currentUserId}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <ManagerSelect
                    userId={r.id}
                    managerId={r.managerId}
                    options={managerOptions.filter((o) => o.id !== r.id)}
                  />
                </td>
                <td className="text-muted-foreground px-4 py-2.5">
                  {r.completed} of {r.assigned}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {r.id !== currentUserId && (
                    <form action={forceSignOut}>
                      <input type="hidden" name="userId" value={r.id} />
                      <ConfirmButton
                        type="submit"
                        variant="ghost"
                        size="sm"
                        confirmText={`Force sign-out ${r.name ?? r.email}? They'll need to sign in again.`}
                        title="Force sign-out"
                      >
                        <LogOut className="size-4" />
                      </ConfirmButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function ManagerPeople({ managerId }: { managerId: string }) {
  const reports = await listReports(managerId);
  const rows = await withStats(reports);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Your team</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        People who report to you and their training progress.
      </p>

      {rows.length === 0 ? (
        <p className="text-muted-foreground mt-6 text-sm">
          No one reports to you yet. An admin sets reporting lines on the
          People page.
        </p>
      ) : (
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
      )}
    </div>
  );
}
