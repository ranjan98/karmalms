import { jwtVerify, createRemoteJWKSet } from "jose";
import { config } from "@/lib/config";
import type { AuthAdapter, AuthUser, Role } from "../types";

/**
 * Trusted-upstream JWT adapter — "append KarmaLMS to your portal session".
 *
 * The company portal has ALREADY logged the user in. It hands KarmaLMS a
 * signed JWT (header, cookie, or short-lived token in the URL). KarmaLMS
 * verifies the signature against the portal's JWKS endpoint and trusts the
 * claims. There is no KarmaLMS login page in this mode.
 *
 * Config: JWT_JWKS_URL, JWT_ISSUER, JWT_AUDIENCE.
 */

const jwks = config.auth.jwt.jwksUrl
  ? createRemoteJWKSet(new URL(config.auth.jwt.jwksUrl))
  : null;

function extractToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  // Fallback: a cookie set by the portal at a shared parent domain.
  const cookie = req.headers.get("cookie") ?? "";
  return cookie.match(/(?:^|;\s*)portal_token=([^;]+)/)?.[1] ?? null;
}

export const trustedJwtAdapter: AuthAdapter = {
  name: "trusted-jwt",

  async getCurrentUser(req: Request): Promise<AuthUser | null> {
    const token = extractToken(req);
    if (!token || !jwks) return null;

    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: config.auth.jwt.issuer || undefined,
        audience: config.auth.jwt.audience || undefined,
      });
      // Claim mapping — adjust to match the company's token shape.
      return {
        externalId: String(payload.sub),
        email: String(payload.email ?? ""),
        name: payload.name ? String(payload.name) : undefined,
        role: (payload.role as Role) ?? "learner",
        orgSlug: String(payload.org ?? "default"),
      };
    } catch {
      return null;
    }
  },

  getLoginUrl(returnTo: string): string {
    // No KarmaLMS login page — bounce back to the company portal.
    return `${config.appUrl}/portal-login?return_to=${encodeURIComponent(returnTo)}`;
  },
};
