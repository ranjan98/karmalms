import { config } from "@/lib/config";
import type { AuthAdapter, AuthUser } from "../types";

/**
 * OIDC / OAuth2 adapter — the default.
 *
 * Point it at any OpenID Connect provider: AWS Cognito, Okta, Azure AD, Auth0,
 * Keycloak. Config: OIDC_ISSUER_URL, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET.
 *
 * STUB: wire up `openid-client` for the authorize/callback/token exchange and
 * map provider claims -> AuthUser. See docs/auth.md.
 */
export const oidcAdapter: AuthAdapter = {
  name: "oidc",

  async getCurrentUser(_req: Request): Promise<AuthUser | null> {
    // TODO: read the session cookie, validate the OIDC id_token, map claims.
    return null;
  },

  getLoginUrl(returnTo: string): string {
    // TODO: build the real authorize URL with PKCE + state.
    const issuer = config.auth.oidc.issuerUrl;
    return `${issuer}/authorize?return_to=${encodeURIComponent(returnTo)}`;
  },
};
