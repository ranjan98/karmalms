"use client";

import { useActionState } from "react";
import { createApiToken } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SCOPES = [
  {
    value: "readwrite",
    title: "Read & write",
    blurb: "Full access — create, update, and delete data.",
  },
  {
    value: "read",
    title: "Read only",
    blurb: "Can fetch data but never change it. Safer for reporting.",
  },
] as const;

/** Creates an API token and shows the plaintext once, inline, on success. */
export function CreateTokenForm() {
  const [state, formAction, pending] = useActionState(createApiToken, {});

  return (
    <div>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Token name</Label>
          <Input id="name" name="name" placeholder="e.g. HRIS sync" required />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">Access scope</legend>
          {SCOPES.map((s, i) => (
            <label
              key={s.value}
              className="hover:bg-muted/50 has-[:checked]:border-primary flex cursor-pointer items-start gap-3 rounded-md border p-3"
            >
              <input
                type="radio"
                name="scope"
                value={s.value}
                defaultChecked={i === 0}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">{s.title}</span>
                <span className="text-muted-foreground block text-xs">
                  {s.blurb}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <Button type="submit" disabled={pending} className="self-start">
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
