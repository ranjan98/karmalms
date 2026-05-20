import type { AuthAdapter, AuthUser } from "../types";

/**
 * Dev auth adapter — no identity provider.
 *
 * Users sign in directly as a seeded account from the /login page. Intended
 * for local development and `docker compose up` demos only. The dev-login
 * route refuses to issue sessions unless AUTH_MODE is `dev`.
 */
export const devAdapter: AuthAdapter = {
  name: "dev",

  async getCurrentUser(): Promise<AuthUser | null> {
    // Identity comes from the session cookie, not the adapter, in dev mode.
    return null;
  },

  getLoginUrl(returnTo: string): string {
    return `/login?returnTo=${encodeURIComponent(returnTo)}`;
  },
};
