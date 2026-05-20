import { config } from "@/lib/config";
import type { AuthAdapter } from "./types";
import { devAdapter } from "./adapters/dev";
import { oidcAdapter } from "./adapters/oidc";
import { trustedJwtAdapter } from "./adapters/trusted-jwt";

/**
 * Resolves the active auth adapter from AUTH_MODE. The rest of the app imports
 * `auth` and never knows which IdP a company uses.
 */
function resolveAdapter(): AuthAdapter {
  switch (config.auth.mode) {
    case "dev":
      return devAdapter;
    case "oidc":
      return oidcAdapter;
    case "trusted-jwt":
      return trustedJwtAdapter;
    case "saml":
      // TODO(v0.x): SAML adapter via @node-saml/passport-saml.
      throw new Error("SAML adapter not yet implemented");
    default:
      throw new Error(`Unknown AUTH_MODE: ${config.auth.mode}`);
  }
}

export const auth: AuthAdapter = resolveAdapter();

export type { AuthAdapter, AuthUser, Role } from "./types";
export type { SessionUser } from "./session-token";
export {
  getCurrentUser,
  requireUser,
  createSession,
  destroySession,
} from "./session";
