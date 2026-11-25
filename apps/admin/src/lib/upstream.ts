/** Base URL of formkiln-server. Only this app's server talks to it. */
export const API_URL = (process.env.FORMKILN_API_URL ?? "http://localhost:8080").replace(
  /\/+$/,
  "",
);

export const SESSION_COOKIE = "formkiln_session";

/** API areas the browser may reach through this app. */
const ALLOWED = /^\/v1\/(admin|manage)\/[A-Za-z0-9._~\-/]*$/;

/** Request headers passed on to formkiln-server. */
const PASS_REQUEST = [
  "content-type",
  "accept",
  "x-requested-with",
  "user-agent",
  "x-forwarded-for",
];

/** Response headers passed back to the browser. */
const PASS_RESPONSE = ["content-type", "content-disposition", "retry-after", "cache-control"];

export function isAllowedPath(path: string): boolean {
  return ALLOWED.test(path) && !path.includes("..") && !path.includes("//");
}

function sessionValues(cookieHeader: string | null): string[] {
  const values: string[] = [];
  for (const part of (cookieHeader ?? "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) values.push(rest.join("="));
  }
  return values;
}

/**
 * Only the session cookie is forwarded; other cookies of this site stay here. Browsers send the
 * cookie with the most specific path first, so a stale cookie scoped to /v1 (set before the
 * cookie was re-scoped to the whole site) would shadow the current one: the site-wide one wins.
 */
export function sessionCookie(cookieHeader: string | null): string | null {
  const values = sessionValues(cookieHeader);
  return values.length ? `${SESSION_COOKIE}=${values[values.length - 1]}` : null;
}

/** Deletes a stale /v1-scoped session cookie when the browser still sends one. */
export function staleCookieCleanup(cookieHeader: string | null): string | null {
  return sessionValues(cookieHeader).length > 1
    ? `${SESSION_COOKIE}=; Path=/v1; Max-Age=0; HttpOnly; SameSite=Strict`
    : null;
}

export function upstreamRequestHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const name of PASS_REQUEST) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const cookie = sessionCookie(request.headers.get("cookie"));
  if (cookie) headers.set("cookie", cookie);
  return headers;
}

function rescope(cookie: string): string {
  return cookie.replace(/;\s*Path=[^;]*/i, "") + "; Path=/";
}

export function downstreamResponseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  for (const name of PASS_RESPONSE) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  // formkiln-server scopes the cookie to its API (/v1). On this origin the console pages need it
  // too (the server-side session check), so it is re-scoped to the whole site.
  for (const cookie of upstream.headers.getSetCookie()) {
    if (cookie.startsWith(`${SESSION_COOKIE}=`)) headers.append("set-cookie", rescope(cookie));
  }
  headers.set("cache-control", upstream.headers.get("cache-control") ?? "no-store");
  return headers;
}
