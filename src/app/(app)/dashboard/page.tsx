import { auth, requireUser } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { llm } from "@/lib/llm";
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
    <div className="mx-auto max-w-4xl px-6 py-10">
      <p className="text-primary text-sm font-semibold">Dashboard</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Welcome, {user.name ?? user.email}
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        <span className="capitalize">{user.role}</span> · {user.orgSlug}
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">The app shell is live</CardTitle>
          <CardDescription>
            Role-aware navigation, light/dark theming, and your company
            branding are all in place. Courses, progress tracking, and manager
            views are next.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Active adapters — auth: <code>{auth.name}</code>, storage:{" "}
          <code>{storage.name}</code>, llm:{" "}
          <code>{llm.enabled ? llm.name : "disabled"}</code>
        </CardContent>
      </Card>
    </div>
  );
}
