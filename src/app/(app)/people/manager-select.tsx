"use client";

import { useRef } from "react";
import { changeUserManager } from "./actions";

/** A manager dropdown that saves on change via the changeUserManager action. */
export function ManagerSelect({
  userId,
  managerId,
  options,
}: {
  userId: string;
  managerId: string | null;
  options: { id: string; label: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={changeUserManager}>
      <input type="hidden" name="userId" value={userId} />
      <select
        name="managerId"
        defaultValue={managerId ?? ""}
        onChange={() => formRef.current?.requestSubmit()}
        className="border-input h-8 max-w-[11rem] rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none"
      >
        <option value="">No manager</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </form>
  );
}
