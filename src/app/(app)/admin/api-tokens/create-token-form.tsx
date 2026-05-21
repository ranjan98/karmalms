"use client";

import { useActionState } from "react";
import { createApiToken } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Creates an API token and shows the plaintext once, inline, on success. */
export function CreateTokenForm() {
  const [state, formAction, pending] = useActionState(createApiToken, {});

  return (
    <div>
      <form action={formAction} className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="name">New token</Label>
          <Input id="name" name="name" placeholder="e.g. HRIS sync" required />
        </div>
        <Button type="submit" disabled={pending}>
          Create token
        </Button>
      </form>

      {state.error && (
        <p className="text-destructive mt-2 text-sm">{state.error}</p>
      )}
      {state.token && (
        <div className="bg-muted mt-3 rounded-md p-3">
          <p className="text-sm font-medium">
            Copy this token now — it won&apos;t be shown again:
          </p>
          <code className="mt-1 block break-all text-sm">{state.token}</code>
        </div>
      )}
    </div>
  );
}
