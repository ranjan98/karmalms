/**
 * Auth adapter contract.
 *
 * KarmaLMS is a RELYING PARTY, never an identity provider. The whole app only
 * depends on `AuthAdapter` — swap the implementation to support a company's
 * own AWS Cognito, Okta, Azure AD, SAML, or an existing portal session.
 */

export type Role = "admin" | "manager" | "learner";

/** The identity KarmaLMS works with — resolved from an external IdP. */
export interface AuthUser {
  externalId: string;
  email: string;
  name?: string;
  role: Role;
  orgSlug: string;
}

export interface AuthAdapter {
  /** Stable name, used in logs and the /api/health response. */
  readonly name: string;

  /**
   * Resolve the current user from an incoming request, or null if not
   * authenticated. Implementations verify tokens/sessions against the
   * company's IdP — they never check passwords themselves.
   */
  getCurrentUser(req: Request): Promise<AuthUser | null>;

  /**
   * Where to send an unauthenticated user. For `oidc` this is the IdP
   * authorize URL; for `trusted-jwt` it is the company portal login.
   */
  getLoginUrl(returnTo: string): string;
}
