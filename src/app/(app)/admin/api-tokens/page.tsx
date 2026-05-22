import Link from "next/link";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listApiTokens } from "@/lib/api-tokens";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/confirm-button";
import { CreateTokenForm } from "./create-token-form";
import { revokeApiToken } from "./actions";

export default async function ApiTokensPage() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");

  const tokens = await listApiTokens(user.orgId);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/admin/settings"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Settings
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        API tokens
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Bearer credentials for the REST API at <code>/api/v1</code>. Send{" "}
        <code>Authorization: Bearer &lt;token&gt;</code>. Each token is scoped
        to your organization and grants either read-only or read &amp; write
        access — pick the narrowest scope an integration needs.
      </p>

      <div className="mt-6">
        <CreateTokenForm />
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {tokens.length === 0 && (
          <p className="text-muted-foreground text-sm">No tokens yet.</p>
        )}
        {tokens.map((t) => (
          <Card key={t.id}>
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{t.name}</p>
                    <Badge variant="secondary">
                      {t.scope === "read" ? "Read-only" : "Read & write"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Created {t.createdAt.toLocaleDateString()} ·{" "}
                    {t.lastUsedAt
                      ? `last used ${t.lastUsedAt.toLocaleDateString()}`
                      : "never used"}
                  </p>
                </div>
                <form action={revokeApiToken}>
                  <input type="hidden" name="id" value={t.id} />
                  <ConfirmButton
                    type="submit"
                    variant="ghost"
                    size="icon"
                    aria-label="Revoke token"
                    confirmText="Revoke this token? Anything using it will stop working."
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
