/**
 * Server-side session helpers — read and write the session cookie.
 *
 * Uses `next/headers`, so it runs in Server Components and Route Handlers
 * (not the middleware — that uses `session-token.ts` directly).
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSessionToken,
  verifySessionToken,
  type SessionUser,
} from "./session-token";

/** Issue a session cookie for an already-provisioned user. */
export async function createSession(user: SessionUser): Promise<void> {
  const token = await signSessionToken(user);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/** The current user, or null if not signed in. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}

/**
 * Like `getCurrentUser`, but redirects to /login when there is no session.
 * Use at the top of protected Server Components as defense in depth — the
 * middleware already gates routes, but this also narrows the type.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export type { SessionUser } from "./session-token";
