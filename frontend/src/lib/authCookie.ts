// Name of the httpOnly cookie holding the backend session token.
// Set and cleared only by the /api/backend proxy route; read by src/proxy.ts for redirects.
export const SESSION_COOKIE = "cl_session";

// Backend paths whose successful response carries a fresh session token
export const SESSION_ISSUING_PATHS = new Set(["api/auth/login", "api/auth/register"]);
export const SESSION_ENDING_PATH = "api/auth/logout";

/** Only allow same-site relative redirects after login (blocks open-redirects like //evil.com). */
export function safeNextPath(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
