import Link from "next/link";
import { auth, requireUser } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { config } from "@/lib/config";
import { storage } from "@/lib/storage";
import { llm } from "@/lib/llm";
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

export default async function DashboardPage() {
  const user = await requireUser();
  const branding = await getBranding(user.orgId);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <Logo
          branding={branding}
          alt={config.brand.name}
          className="h-7 w-auto"
        />
        <div className="flex items-center gap-2">
          {user.role === "admin" && (
            <Button asChild variant="ghost">
              <Link href="/admin/settings">Settings</Link>
            </Button>
          )}
          <ThemeToggle />
          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <div className="mt-10">
        <p className="text-primary text-sm font-semibold">Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Welcome, {user.name ?? user.email}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          <span className="capitalize">{user.role}</span> · {user.orgSlug}
        </p>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Authenticated session</CardTitle>
          <CardDescription>
            Sessions, JIT provisioning, route protection, and light/dark
            theming are live. The real dashboard — courses, progress, and
            manager views — lands in step 3.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Active adapters — auth: <code>{auth.name}</code>, storage:{" "}
          <code>{storage.name}</code>, llm:{" "}
          <code>{llm.enabled ? llm.name : "disabled"}</code>
        </CardContent>
      </Card>
    </main>
  );
}
