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

/** Only the session cookie is forwarded; other cookies of this site stay here. */
export function sessionCookie(cookieHeader: string | null): string | null {
  for (const part of (cookieHeader ?? "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return `${SESSION_COOKIE}=${rest.join("=")}`;
  }
  return null;
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
