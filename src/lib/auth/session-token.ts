/**
 * Session token primitives — sign and verify the KarmaLMS session JWT.
 *
 * This file is deliberately edge-safe: it imports only `jose` and `config`
 * (no `next/headers`, no database). That lets the middleware verify sessions
 * without pulling in Node-only code.
 */
import { SignJWT, jwtVerify } from "jose";
import { config } from "@/lib/config";
import type { Role } from "./types";

export const SESSION_COOKIE = "karmalms_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const secret = new TextEncoder().encode(config.auth.sessionSecret);

/** The identity carried in the session cookie — already provisioned in the DB. */
export interface SessionUser {
  id: string; // KarmaLMS user UUID
  email: string;
  name?: string;
  role: Role;
  orgId: string;
  orgSlug: string;
  // Session-revocation epoch — checked against the user row on each request.
  sessionEpoch: number;
}

export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      id: String(payload.id),
      email: String(payload.email),
      name: payload.name ? String(payload.name) : undefined,
      role: payload.role as Role,
      orgId: String(payload.orgId),
      orgSlug: String(payload.orgSlug),
      sessionEpoch: Number(payload.sessionEpoch ?? 0),
    };
  } catch {
    return null;
  }
}
