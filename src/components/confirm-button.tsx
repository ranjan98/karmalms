"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

/**
 * A submit button that asks for confirmation first — used for destructive
 * actions inside server-action forms.
 */
export function ConfirmButton({
  confirmText = "Are you sure?",
  ...props
}: React.ComponentProps<typeof Button> & { confirmText?: string }) {
  return (
    <Button
      {...props}
      onClick={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    />
  );
}
