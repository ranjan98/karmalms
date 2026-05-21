import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { config } from "@/lib/config";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

/**
 * Layout for the authenticated app. `requireUser` is belt-and-suspenders —
 * the middleware already gates these routes — and also narrows the type.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // Block users a directory sync has deactivated (or that were removed).
  const [account] = await db
    .select({ active: schema.users.active })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1);

  if (!account || !account.active) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          Account deactivated
        </h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          Your account is no longer active. Contact your administrator if you
          believe this is a mistake.
        </p>
        <form action="/api/auth/logout" method="post">
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </main>
    );
  }

  const branding = await getBranding(user.orgId);

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        orgSlug: user.orgSlug,
      }}
      branding={branding}
      brandName={config.brand.name}
    >
      {children}
    </AppShell>
  );
}
