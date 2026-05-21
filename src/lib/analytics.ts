/**
 * Org-wide training analytics — headline numbers, completion broken down by
 * department, and certificate health.
 */
import {
  listOrgUsers,
  enrollmentCountsByUser,
  listCourseCompletion,
} from "@/lib/enrollments";
import { listOrgCertificates, certStatus } from "@/lib/certificates";

export interface DepartmentStat {
  name: string;
  people: number;
  assigned: number;
  completed: number;
}

export interface OrgAnalytics {
  people: number;
  courses: number;
  totalAssigned: number;
  totalCompleted: number;
  completionRate: number;
  departments: DepartmentStat[];
  certHealth: { valid: number; expiring: number; expired: number };
}

export async function orgAnalytics(orgId: string): Promise<OrgAnalytics> {
  const users = await listOrgUsers(orgId);
  const courses = await listCourseCompletion(orgId);
  const certs = await listOrgCertificates(orgId);

  // Completion rolled up by department — one query for all users.
  const counts = await enrollmentCountsByUser(users.map((u) => u.id));
  const byDept = new Map<string, DepartmentStat>();
  for (const user of users) {
    const dept = user.department?.trim() || "Unassigned";
    const c = counts.get(user.id) ?? { assigned: 0, completed: 0 };
    const entry = byDept.get(dept) ?? {
      name: dept,
      people: 0,
      assigned: 0,
      completed: 0,
    };
    entry.people += 1;
    entry.assigned += c.assigned;
    entry.completed += c.completed;
    byDept.set(dept, entry);
  }
  const departments = [...byDept.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const certHealth = { valid: 0, expiring: 0, expired: 0 };
  for (const cert of certs) certHealth[certStatus(cert.expiresAt)] += 1;

  const totalAssigned = courses.reduce((sum, c) => sum + c.total, 0);
  const totalCompleted = courses.reduce((sum, c) => sum + c.completed, 0);

  return {
    people: users.length,
    courses: courses.length,
    totalAssigned,
    totalCompleted,
    completionRate:
      totalAssigned > 0
        ? Math.round((totalCompleted / totalAssigned) * 100)
        : 0,
    departments,
    certHealth,
  };
}
