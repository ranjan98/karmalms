import Link from "next/link";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listWebhooks } from "@/lib/webhooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmButton } from "@/components/confirm-button";
import { createWebhook, deleteWebhook } from "./actions";

export default async function WebhooksPage() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");

  const hooks = await listWebhooks(user.orgId);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/admin/settings"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Settings
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Webhooks</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        KarmaLMS POSTs a signed JSON payload to each URL when an event fires —
        events: <code>course.completed</code>, <code>certificate.issued</code>.
        Verify deliveries with the <code>X-KarmaLMS-Signature</code> header
        (HMAC-SHA256 of the request body, keyed with the webhook&apos;s secret).
      </p>

      <form action={createWebhook} className="mt-6 flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="url">Add an endpoint</Label>
          <Input
            id="url"
            name="url"
            type="url"
            placeholder="https://example.com/karmalms-webhook"
            required
          />
        </div>
        <Button type="submit">Add</Button>
      </form>

      <div className="mt-6 flex flex-col gap-3">
        {hooks.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No webhooks registered yet.
          </p>
        )}
        {hooks.map((hook) => (
          <Card key={hook.id}>
            <CardContent>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{hook.url}</p>
                  <p className="text-muted-foreground mt-1 text-xs break-all">
                    Signing secret:{" "}
                    <code className="bg-muted rounded px-1 py-0.5">
                      {hook.secret}
                    </code>
                  </p>
                </div>
                <form action={deleteWebhook}>
                  <input type="hidden" name="id" value={hook.id} />
                  <ConfirmButton
                    type="submit"
                    variant="ghost"
                    size="icon"
                    aria-label="Delete webhook"
                    confirmText="Delete this webhook?"
                  >
                    <Trash2 />
                  </ConfirmButton>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
