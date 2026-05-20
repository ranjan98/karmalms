"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { isUuid } from "@/lib/courses";
import { newWebhookSecret } from "@/lib/webhooks";

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Error("Only admins can manage webhooks.");
  }
  return user;
}

export async function createWebhook(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const url = String(formData.get("url") ?? "").trim();
  if (!/^https?:\/\/.+/i.test(url)) {
    throw new Error("Enter a valid http(s) URL.");
  }

  await db.insert(schema.webhooks).values({
    orgId: user.orgId,
    url,
    secret: newWebhookSecret(),
  });

  revalidatePath("/admin/webhooks");
}

export async function deleteWebhook(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return;

  await db
    .delete(schema.webhooks)
    .where(
      and(eq(schema.webhooks.id, id), eq(schema.webhooks.orgId, user.orgId)),
    );

  revalidatePath("/admin/webhooks");
}
