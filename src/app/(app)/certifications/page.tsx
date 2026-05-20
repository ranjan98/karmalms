import { requireUser } from "@/lib/auth";
import {
  listUserCertificates,
  listOrgCertificates,
  certStatus,
  type CertStatus,
} from "@/lib/certificates";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<CertStatus, string> = {
  valid: "Valid",
  expiring: "Expiring soon",
  expired: "Expired",
};

function StatusBadge({ expiresAt }: { expiresAt: Date }) {
  const status = certStatus(expiresAt);
  const variant =
    status === "valid"
      ? "default"
      : status === "expiring"
        ? "secondary"
        : "destructive";
  return <Badge variant={variant}>{STATUS_LABEL[status]}</Badge>;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function CertificationsPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Certifications</h1>
      {user.role === "learner" ? (
        <LearnerCerts userId={user.id} />
      ) : (
        <OrgCerts orgId={user.orgId} />
      )}
    </div>
  );
}

async function LearnerCerts({ userId }: { userId: string }) {
  const certs = await listUserCertificates(userId);

  return (
    <>
      <p className="text-muted-foreground mt-1 text-sm">
        Certificates you&apos;ve earned by completing courses.
      </p>
      {certs.length === 0 ? (
        <p className="text-muted-foreground mt-6 text-sm">
          No certificates yet — complete a course that issues one.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground bg-muted/50 text-left">
                <th className="px-4 py-2.5 font-medium">Course</th>
                <th className="px-4 py-2.5 font-medium">Issued</th>
                <th className="px-4 py-2.5 font-medium">Expires</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {certs.map((c) => (
                <tr key={c.courseId} className="border-t">
                  <td className="px-4 py-2.5 font-medium">{c.courseTitle}</td>
                  <td className="text-muted-foreground px-4 py-2.5">
                    {fmtDate(c.issuedAt)}
                  </td>
                  <td className="text-muted-foreground px-4 py-2.5">
                    {fmtDate(c.expiresAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge expiresAt={c.expiresAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

async function OrgCerts({ orgId }: { orgId: string }) {
  const certs = await listOrgCertificates(orgId);
  const expiring = certs.filter(
    (c) => certStatus(c.expiresAt) !== "valid",
  ).length;

  return (
    <>
      <p className="text-muted-foreground mt-1 text-sm">
        Every certificate across your organization
        {expiring > 0 ? ` — ${expiring} need attention.` : "."}
      </p>
      {certs.length === 0 ? (
        <p className="text-muted-foreground mt-6 text-sm">
          No certificates issued yet.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground bg-muted/50 text-left">
                <th className="px-4 py-2.5 font-medium">Person</th>
                <th className="px-4 py-2.5 font-medium">Course</th>
                <th className="px-4 py-2.5 font-medium">Expires</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {certs.map((c, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-2.5">
                    <div className="font-medium">
                      {c.userName ?? c.userEmail}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {c.userEmail}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">{c.courseTitle}</td>
                  <td className="text-muted-foreground px-4 py-2.5">
                    {fmtDate(c.expiresAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge expiresAt={c.expiresAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
