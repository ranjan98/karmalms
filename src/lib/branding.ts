/**
 * Effective branding for an org — colors, logos, banner.
 *
 * Resolution order: per-org overrides stored in `orgs.branding` (set by an
 * admin in-app), merged over the env-var defaults. So a fresh install looks
 * fine immediately, and a company can rebrand without a redeploy.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { config } from "@/lib/config";

export interface OrgBranding {
  primaryColor: string;
  logoLight: string;
  logoDark: string;
  bannerLight?: string;
  bannerDark?: string;
}

const HEX = /^#[0-9a-fA-F]{3,8}$/;

/**
 * Only allow a plain hex color. The value reaches an inline <style>, so this
 * guards against CSS injection from admin-supplied input.
 */
export function safeColor(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX.test(value.trim())
    ? value.trim()
    : fallback;
}

/**
 * A stored asset value is either a full URL / absolute path (an env default)
 * or a storage key for a file an admin uploaded. Keys are served back through
 * the /api/assets route.
 */
function toAssetUrl(value: string): string {
  if (value.startsWith("/") || value.startsWith("http")) return value;
  return `/api/assets/${value}`;
}

function defaults(): OrgBranding {
  return {
    primaryColor: safeColor(config.brand.primaryColor, "#6366f1"),
    logoLight: config.brand.logoLight,
    logoDark: config.brand.logoDark,
    bannerLight: config.brand.bannerLight || undefined,
    bannerDark: config.brand.bannerDark || undefined,
  };
}

/** Branding for an org (DB overrides merged over env defaults). */
export async function getBranding(orgId?: string): Promise<OrgBranding> {
  const base = defaults();
  if (!orgId) return base;

  const [org] = await db
    .select({ branding: schema.orgs.branding })
    .from(schema.orgs)
    .where(eq(schema.orgs.id, orgId))
    .limit(1);

  const stored = (org?.branding ?? null) as Partial<OrgBranding> | null;
  if (!stored) return base;

  return {
    primaryColor: safeColor(stored.primaryColor, base.primaryColor),
    logoLight: stored.logoLight ? toAssetUrl(stored.logoLight) : base.logoLight,
    logoDark: stored.logoDark ? toAssetUrl(stored.logoDark) : base.logoDark,
    bannerLight: stored.bannerLight
      ? toAssetUrl(stored.bannerLight)
      : base.bannerLight,
    bannerDark: stored.bannerDark
      ? toAssetUrl(stored.bannerDark)
      : base.bannerDark,
  };
}
