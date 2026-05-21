import { redirect } from "next/navigation";
import { config } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { db, schema } from "@/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo = "/dashboard" } = await searchParams;

  // Already signed in — skip the login page.
  if (await getCurrentUser()) redirect(returnTo);

  const branding = await getBranding();

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Logo
        branding={branding}
        alt={config.brand.name}
        className="mb-6 h-9 w-auto"
      />

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            Sign in to {config.brand.name}
          </CardTitle>
          <CardDescription>
            {config.auth.mode === "dev"
              ? "Development mode — choose a demo account."
              : config.auth.mode === "trusted-jwt"
                ? "Sign in through your company portal."
                : "Continue with your organization's identity provider."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {config.auth.mode === "dev" ? (
            <DevLogin returnTo={returnTo} />
          ) : config.auth.mode === "oidc" ? (
            <Button asChild className="w-full">
              <a
                href={`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`}
              >
                Sign in with SSO
              </a>
            </Button>
          ) : config.auth.mode === "saml" ? (
            <Button asChild className="w-full">
              <a
                href={`/api/auth/saml/login?returnTo=${encodeURIComponent(returnTo)}`}
              >
                Sign in with SSO
              </a>
            </Button>
          ) : (
            <p className="text-muted-foreground text-sm">
              Sign-in is handled by your company portal — open KarmaLMS from
              there.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

/** Lists seeded accounts so a developer can sign in with one click. */
async function DevLogin({ returnTo }: { returnTo: string }) {
  const users = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
    })
    .from(schema.users)
    .orderBy(schema.users.role);

  if (users.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No accounts yet. Run{" "}
        <code className="bg-muted rounded px-1 py-0.5">npm run db:seed</code> to
        create demo users.
      </p>
    );
  }

  return (
    <form
      action="/api/auth/dev-login"
      method="post"
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      {users.map((u) => (
        <Button
          key={u.id}
          type="submit"
          name="userId"
          value={u.id}
          variant="outline"
          className="h-auto justify-start py-2.5"
        >
          <span className="flex flex-col items-start gap-0.5">
            <span className="font-medium">{u.name ?? u.email}</span>
            <span className="text-muted-foreground text-xs">
              <span className="capitalize">{u.role}</span> · {u.email}
            </span>
          </span>
        </Button>
      ))}
    </form>
  );
}
