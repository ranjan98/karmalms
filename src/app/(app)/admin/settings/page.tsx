import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { saveBranding } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");

  const { saved } = await searchParams;
  const branding = await getBranding(user.orgId);

  const [org] = await db
    .select({ name: schema.orgs.name })
    .from(schema.orgs)
    .where(eq(schema.orgs.id, user.orgId))
    .limit(1);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Branding</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Customize how KarmaLMS looks for everyone in your organization.
      </p>

      {saved && (
        <p className="bg-primary/10 text-primary mt-5 rounded-md px-3 py-2 text-sm font-medium">
          Branding saved.
        </p>
      )}

      <form action={saveBranding} className="mt-6 flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identity</CardTitle>
            <CardDescription>Company name and accent color.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="orgName">Company name</Label>
              <Input
                id="orgName"
                name="orgName"
                defaultValue={org?.name ?? ""}
                className="max-w-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="primaryColor">Primary color</Label>
              <div className="flex items-center gap-3">
                <input
                  id="primaryColor"
                  name="primaryColor"
                  type="color"
                  defaultValue={branding.primaryColor}
                  className="border-input h-9 w-16 cursor-pointer rounded-md border bg-transparent"
                />
                <span className="text-muted-foreground text-sm">
                  Applied to buttons, links, and accents app-wide.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logos &amp; banner</CardTitle>
            <CardDescription>
              PNG, JPG, SVG, or WebP — up to 2 MB each. Leave a field empty to
              keep the current file.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <AssetField
              name="logoLight"
              label="Logo — light mode"
              current={branding.logoLight}
            />
            <AssetField
              name="logoDark"
              label="Logo — dark mode"
              current={branding.logoDark}
              dark
            />
            <AssetField
              name="bannerLight"
              label="Banner — light mode"
              current={branding.bannerLight}
            />
            <AssetField
              name="bannerDark"
              label="Banner — dark mode"
              current={branding.bannerDark}
              dark
            />
          </CardContent>
        </Card>

        <div>
          <Button type="submit">Save branding</Button>
        </div>
      </form>

      <div className="mt-10 border-t pt-6">
        <h2 className="text-base font-semibold">Integrations</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Send <code>course.completed</code> and{" "}
          <code>certificate.issued</code> events to external systems.
        </p>
        <Button asChild variant="outline" className="mt-3">
          <Link href="/admin/webhooks">Manage webhooks</Link>
        </Button>
      </div>
    </div>
  );
}

function AssetField({
  name,
  label,
  current,
  dark,
}: {
  name: string;
  label: string;
  current?: string;
  dark?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-12 w-24 shrink-0 items-center justify-center rounded-md border p-1",
            dark ? "bg-neutral-900" : "bg-white",
          )}
        >
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current} alt="" className="max-h-full max-w-full" />
          ) : (
            <span className="text-muted-foreground text-xs">none</span>
          )}
        </span>
        <Input
          id={name}
          name={name}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="max-w-xs"
        />
      </div>
    </div>
  );
}
