import * as oidc from "openid-client";
import { SignJWT, jwtVerify } from "jose";
import { config } from "@/lib/config";
import type { AuthAdapter, AuthUser, Role } from "../types";

/**
 * OIDC / OAuth2 adapter — production single sign-on.
 *
 * Works with any OpenID Connect provider: AWS Cognito, Okta, Azure AD, Auth0,
 * Keycloak. /api/auth/login starts the flow; the IdP redirects to
 * /api/auth/callback, which exchanges the code and provisions the user.
 *
 * Config: OIDC_ISSUER_URL, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_SCOPES,
 * OIDC_ORG_SLUG, OIDC_ADMIN_EMAILS.
 */

let discovered: oidc.Configuration | null = null;

async function oidcConfig(): Promise<oidc.Configuration> {
  if (discovered) return discovered;
  const { issuerUrl, clientId, clientSecret } = config.auth.oidc;
  if (!issuerUrl || !clientId) {
    throw new Error(
      "OIDC is not configured (set OIDC_ISSUER_URL and OIDC_CLIENT_ID).",
    );
  }
  discovered = await oidc.discovery(
    new URL(issuerUrl),
    clientId,
    clientSecret || undefined,
  );
  return discovered;
}

function redirectUri(): string {
  return `${config.appUrl}/api/auth/callback`;
}

// --- Transient login-flow state (PKCE verifier + state) ------------------

export const OIDC_FLOW_COOKIE = "karmalms_oidc_flow";
const flowSecret = new TextEncoder().encode(config.auth.sessionSecret);

interface OidcFlow {
  codeVerifier: string;
  state: string;
  returnTo: string;
}

export async function signOidcFlow(flow: OidcFlow): Promise<string> {
  return new SignJWT({ ...flow })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(flowSecret);
}

export async function readOidcFlow(token: string): Promise<OidcFlow | null> {
  try {
    const { payload } = await jwtVerify(token, flowSecret);
    return {
      codeVerifier: String(payload.codeVerifier),
      state: String(payload.state),
      returnTo: String(payload.returnTo),
    };
  } catch {
    return null;
  }
}

// --- The two halves of the auth-code flow --------------------------------

/** Builds the IdP authorization URL and the PKCE/state to remember. */
export async function startOidcLogin(): Promise<{
  authorizationUrl: string;
  codeVerifier: string;
  state: string;
}> {
  const cfg = await oidcConfig();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
  const state = oidc.randomState();

  const url = oidc.buildAuthorizationUrl(cfg, {
    redirect_uri: redirectUri(),
    scope: config.auth.oidc.scopes,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  });

  return { authorizationUrl: url.href, codeVerifier, state };
}

/** Exchanges the callback for tokens and maps the claims to an AuthUser. */
export async function completeOidcLogin(
  currentUrl: URL,
  codeVerifier: string,
  state: string,
): Promise<AuthUser> {
  const cfg = await oidcConfig();
  const tokens = await oidc.authorizationCodeGrant(cfg, currentUrl, {
    pkceCodeVerifier: codeVerifier,
    expectedState: state,
  });

  const claims = tokens.claims();
  const sub = claims?.sub ? String(claims.sub) : "";
  const claimEmail = claims?.email;
  const claimName = claims?.name;
  let email = typeof claimEmail === "string" ? claimEmail : "";
  let name = typeof claimName === "string" ? claimName : undefined;

  // Some providers only return the profile from the userinfo endpoint.
  if ((!email || !name) && tokens.access_token && sub) {
    try {
      const info = await oidc.fetchUserInfo(cfg, tokens.access_token, sub);
      if (!email && typeof info.email === "string") email = info.email;
      if (!name && typeof info.name === "string") name = info.name;
    } catch {
      // userinfo is optional — fall back to the id_token claims
    }
  }

  return {
    externalId: sub,
    email,
    name,
    role: roleForEmail(email),
    orgSlug: config.auth.oidc.orgSlug,
  };
}

/** First-login role: admins are bootstrapped via OIDC_ADMIN_EMAILS. */
function roleForEmail(email: string): Role {
  const admins = config.auth.oidc.adminEmails;
  return email && admins.includes(email.toLowerCase()) ? "admin" : "learner";
}

export const oidcAdapter: AuthAdapter = {
  name: "oidc",

  async getCurrentUser(): Promise<AuthUser | null> {
    // Identity lives in the session cookie once the callback completes.
    return null;
  },

  getLoginUrl(returnTo: string): string {
    return `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
  },
};
