import { auth, requireUser } from "@/lib/auth";
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

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-primary text-sm font-semibold">Dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Welcome, {user.name ?? user.email}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            <span className="capitalize">{user.role}</span> · {user.orgSlug}
          </p>
        </div>
        <form action="/api/auth/logout" method="post">
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Authenticated session</CardTitle>
          <CardDescription>
            Sessions, JIT user provisioning, and route protection are live. The
            real dashboard — courses, progress, and manager views — lands in
            step 3.
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
