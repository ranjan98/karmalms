/**
 * SCIM 2.0 helpers (RFC 7644) — just enough of the protocol for identity
 * providers (Okta, Azure AD) to provision and deprovision users.
 */

const USER_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User";
const LIST_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:ListResponse";
const ERROR_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:Error";

interface ScimUserInput {
  id: string;
  email: string;
  name: string | null;
  active: boolean;
}

export function scimJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/scim+json" },
  });
}

export function scimError(status: number, detail: string): Response {
  return scimJson(
    { schemas: [ERROR_SCHEMA], status: String(status), detail },
    status,
  );
}

export function toScimUser(user: ScimUserInput) {
  return {
    schemas: [USER_SCHEMA],
    id: user.id,
    userName: user.email,
    displayName: user.name ?? undefined,
    emails: [{ value: user.email, primary: true }],
    active: user.active,
  };
}

export function scimListResponse(users: ScimUserInput[]) {
  return {
    schemas: [LIST_SCHEMA],
    totalResults: users.length,
    startIndex: 1,
    itemsPerPage: users.length,
    Resources: users.map(toScimUser),
  };
}

/** The email a SCIM User resource carries (userName, else a primary email). */
export function scimEmail(body: unknown): string {
  const b = (body ?? {}) as { userName?: unknown; emails?: unknown };
  if (typeof b.userName === "string" && b.userName.includes("@")) {
    return b.userName.trim().toLowerCase();
  }
  const emails = Array.isArray(b.emails) ? b.emails : [];
  const primary =
    emails.find((e) => (e as { primary?: unknown })?.primary) ?? emails[0];
  const value = (primary as { value?: unknown })?.value;
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/** The display name from a SCIM User resource (displayName, else name parts). */
export function scimName(body: unknown): string | null {
  const b = (body ?? {}) as {
    displayName?: unknown;
    name?: { givenName?: unknown; familyName?: unknown };
  };
  if (typeof b.displayName === "string" && b.displayName.trim()) {
    return b.displayName.trim();
  }
  const parts = [b.name?.givenName, b.name?.familyName]
    .filter((p): p is string => typeof p === "string" && p.length > 0)
    .join(" ");
  return parts || null;
}

/** Reads `userName eq "..."` out of a SCIM filter query. */
export function scimUserNameFilter(filter: string | null): string | null {
  const match = filter?.match(/userName eq "([^"]+)"/i);
  return match ? match[1].trim().toLowerCase() : null;
}

/** Flattens a SCIM PATCH body to the fields KarmaLMS supports. */
export function applyScimPatch(body: unknown): {
  active?: boolean;
  name?: string;
} {
  const ops = (body as { Operations?: unknown }).Operations;
  const result: { active?: boolean; name?: string } = {};
  if (!Array.isArray(ops)) return result;

  const truthy = (v: unknown) => v === true || v === "true";

  for (const op of ops) {
    const o = (op ?? {}) as { path?: unknown; value?: unknown };
    const path = typeof o.path === "string" ? o.path.toLowerCase() : "";
    if (path === "active") {
      result.active = truthy(o.value);
    } else if (path === "displayname") {
      result.name = String(o.value ?? "");
    } else if (!o.path && o.value && typeof o.value === "object") {
      const v = o.value as Record<string, unknown>;
      if ("active" in v) result.active = truthy(v.active);
      if (typeof v.displayName === "string") result.name = v.displayName;
    }
  }
  return result;
}
