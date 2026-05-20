import { requireUser } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { config } from "@/lib/config";
import { AppShell } from "@/components/app-shell";

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
