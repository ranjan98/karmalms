import { jwtVerify, createRemoteJWKSet } from "jose";
import { config } from "@/lib/config";
import type { AuthAdapter, AuthUser, Role } from "../types";

/**
 * Trusted-upstream JWT adapter — "append KarmaLMS to your portal session".
 *
 * The company portal has ALREADY logged the user in. It sends them to
 * /api/auth/exchange with a signed JWT; KarmaLMS verifies it against the
 * portal's JWKS endpoint, trusts the claims, and issues its own session.
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

/** Verifies a portal JWT and maps its claims to an AuthUser. */
export async function verifyPortalToken(
  token: string,
): Promise<AuthUser | null> {
  if (!jwks) return null;
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
}

export const trustedJwtAdapter: AuthAdapter = {
  name: "trusted-jwt",

  async getCurrentUser(req: Request): Promise<AuthUser | null> {
    const token = extractToken(req);
    return token ? verifyPortalToken(token) : null;
  },

  getLoginUrl(returnTo: string): string {
    // No KarmaLMS login page — bounce back to the company portal.
    return `${config.appUrl}/portal-login?return_to=${encodeURIComponent(returnTo)}`;
  },
};
