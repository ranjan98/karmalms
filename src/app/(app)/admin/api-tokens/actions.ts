"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { isUuid } from "@/lib/courses";
import { generateApiToken } from "@/lib/api-tokens";

/**
 * Creates an API token and returns the plaintext once — only the hash is
 * stored. Shaped for `useActionState`.
 */
export async function createApiToken(
  _prev: { token?: string; error?: string },
  formData: FormData,
): Promise<{ token?: string; error?: string }> {
  const user = await requireUser();
  if (user.role !== "admin") {
    return { error: "Only admins can create API tokens." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the token a name." };

  const { token, hash } = generateApiToken();
  await db
    .insert(schema.apiTokens)
    .values({ orgId: user.orgId, name, tokenHash: hash });

  revalidatePath("/admin/api-tokens");
  return { token };
}

export async function revokeApiToken(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Error("Only admins can manage API tokens.");
  }
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return;

  await db
    .delete(schema.apiTokens)
    .where(
      and(eq(schema.apiTokens.id, id), eq(schema.apiTokens.orgId, user.orgId)),
    );

  revalidatePath("/admin/api-tokens");
}
