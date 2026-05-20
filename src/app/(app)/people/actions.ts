"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { isUuid } from "@/lib/courses";

/** Changes a user's role. Admin-only, org-scoped, and never your own role. */
export async function changeUserRole(formData: FormData): Promise<void> {
  const actor = await requireUser();
  if (actor.role !== "admin") {
    throw new Error("Only admins can change roles.");
  }

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!isUuid(userId)) throw new Error("User not found.");
  if (role !== "admin" && role !== "manager" && role !== "learner") {
    throw new Error("Invalid role.");
  }
  if (userId === actor.id) {
    // Guards against an admin locking themselves out.
    throw new Error("You can't change your own role.");
  }

  await db
    .update(schema.users)
    .set({ role })
    .where(
      and(eq(schema.users.id, userId), eq(schema.users.orgId, actor.orgId)),
    );

  revalidatePath("/people");
}

/** Assigns (or clears) a user's manager. Admin-only, org-scoped. */
export async function changeUserManager(formData: FormData): Promise<void> {
  const actor = await requireUser();
  if (actor.role !== "admin") {
    throw new Error("Only admins can assign managers.");
  }

  const userId = String(formData.get("userId") ?? "");
  const managerRaw = String(formData.get("managerId") ?? "");
  if (!isUuid(userId)) throw new Error("User not found.");

  const managerId = isUuid(managerRaw) ? managerRaw : null;
  if (managerId === userId) {
    throw new Error("A user can't be their own manager.");
  }

  // A manager set must be a real user in the same org.
  if (managerId) {
    const [manager] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.id, managerId),
          eq(schema.users.orgId, actor.orgId),
        ),
      )
      .limit(1);
    if (!manager) throw new Error("Manager not found.");
  }

  await db
    .update(schema.users)
    .set({ managerId })
    .where(
      and(eq(schema.users.id, userId), eq(schema.users.orgId, actor.orgId)),
    );

  revalidatePath("/people");
}
