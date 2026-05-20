"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { storage } from "@/lib/storage";
import { requireUser } from "@/lib/auth";
import { safeColor } from "@/lib/branding";

const ASSET_VARIANTS = [
  "logoLight",
  "logoDark",
  "bannerLight",
  "bannerDark",
] as const;

/** Accepted upload types mapped to the file extension used in the storage key. */
const ALLOWED_TYPES = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/svg+xml", "svg"],
  ["image/webp", "webp"],
]);

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB per file

/**
 * Saves an org's branding: accent color, company name, and any newly uploaded
 * logo / banner files. Variants left blank keep their current file. Admin only.
 */
export async function saveBranding(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Error("Only admins can change branding.");
  }

  // Start from whatever is already stored (raw storage keys).
  const [org] = await db
    .select({ branding: schema.orgs.branding })
    .from(schema.orgs)
    .where(eq(schema.orgs.id, user.orgId))
    .limit(1);

  const branding: Record<string, string> = {
    ...((org?.branding as Record<string, string> | null) ?? {}),
  };

  branding.primaryColor = safeColor(
    formData.get("primaryColor"),
    branding.primaryColor || "#6366f1",
  );

  for (const variant of ASSET_VARIANTS) {
    const file = formData.get(variant);
    if (!(file instanceof File) || file.size === 0) continue;

    const ext = ALLOWED_TYPES.get(file.type);
    if (!ext) {
      throw new Error(`Unsupported file type for ${variant}: ${file.type}`);
    }
    if (file.size > MAX_BYTES) {
      throw new Error(`${variant} is larger than the 2 MB limit.`);
    }

    const key = `branding/${user.orgId}/${variant}-${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    await storage.put(key, bytes, { contentType: file.type });
    branding[variant] = key;
  }

  const name = String(formData.get("orgName") ?? "").trim();

  await db
    .update(schema.orgs)
    .set({ branding, ...(name ? { name } : {}) })
    .where(eq(schema.orgs.id, user.orgId));

  // Branding is read in the root layout — refresh everything.
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}
