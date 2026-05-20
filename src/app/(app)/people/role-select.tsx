"use client";

import { useRef } from "react";
import type { Role } from "@/lib/auth";
import { changeUserRole } from "./actions";

/** A role dropdown that saves on change via the changeUserRole server action. */
export function RoleSelect({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: Role;
  disabled?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={changeUserRole}>
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={role}
        disabled={disabled}
        title={disabled ? "You can't change your own role" : undefined}
        onChange={() => formRef.current?.requestSubmit()}
        className="border-input h-8 rounded-md border bg-transparent px-2 text-sm capitalize shadow-xs outline-none disabled:opacity-60"
      >
        <option value="learner">Learner</option>
        <option value="manager">Manager</option>
        <option value="admin">Admin</option>
      </select>
    </form>
  );
}
