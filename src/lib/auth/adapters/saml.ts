import { SAML } from "@node-saml/node-saml";
import { config } from "@/lib/config";
import type { AuthAdapter, AuthUser, Role } from "../types";

/**
 * SAML 2.0 adapter — SP-initiated SSO with enterprise IdPs (Okta, Azure AD,
 * OneLogin, ADFS). /api/auth/saml/login redirects to the IdP; the IdP POSTs
 * its signed assertion back to /api/auth/saml/callback.
 *
 * Config: SAML_ENTRY_POINT, SAML_ISSUER, SAML_IDP_CERT, SAML_ORG_SLUG,
 * SAML_ADMIN_EMAILS.
 */

function samlClient(): SAML {
  const { entryPoint, issuer, idpCert } = config.auth.saml;
  if (!entryPoint || !idpCert) {
    throw new Error(
      "SAML is not configured (set SAML_ENTRY_POINT and SAML_IDP_CERT).",
    );
  }
  return new SAML({
    callbackUrl: `${config.appUrl}/api/auth/saml/callback`,
    entryPoint,
    issuer,
    idpCert,
    audience: false,
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
  });
}

/** Builds the IdP redirect URL; `returnTo` rides along as RelayState. */
export async function startSamlLogin(returnTo: string): Promise<string> {
  return samlClient().getAuthorizeUrlAsync(returnTo, "", {});
}

/** Validates a SAML Response and maps the assertion to an AuthUser. */
export async function completeSamlLogin(
  samlResponse: string,
): Promise<AuthUser> {
  const { profile } = await samlClient().validatePostResponseAsync({
    SAMLResponse: samlResponse,
  });
  if (!profile) {
    throw new Error("The SAML response contained no assertion.");
  }

  const email = String(profile.email ?? profile.nameID ?? "");
  const attrs = (profile.attributes ?? {}) as Record<string, unknown>;
  const rawName = attrs.displayName ?? attrs.name;

  return {
    externalId: String(profile.nameID),
    email,
    name: typeof rawName === "string" ? rawName : undefined,
    role: roleForEmail(email),
    orgSlug: config.auth.saml.orgSlug,
  };
}

/** First-login role: admins are bootstrapped via SAML_ADMIN_EMAILS. */
function roleForEmail(email: string): Role {
  const admins = config.auth.saml.adminEmails;
  return email && admins.includes(email.toLowerCase()) ? "admin" : "learner";
}

export const samlAdapter: AuthAdapter = {
  name: "saml",

  async getCurrentUser(): Promise<AuthUser | null> {
    return null;
  },

  getLoginUrl(returnTo: string): string {
    return `/api/auth/saml/login?returnTo=${encodeURIComponent(returnTo)}`;
  },
};
