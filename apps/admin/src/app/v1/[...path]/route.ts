import {
  API_URL,
  downstreamResponseHeaders,
  isAllowedPath,
  staleCookieCleanup,
  upstreamRequestHeaders,
} from "../../../lib/upstream";

/**
 * Same-origin gateway to formkiln-server's admin and management API. The browser never talks
 * to the server directly: no CORS, the server URL stays private, and the server's session cookie
 * (path /v1) lives on this origin. The service token is never accepted from the browser.
 */
async function forward(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (!isAllowedPath(url.pathname)) {
    return Response.json({ status: 404, title: "Not found" }, { status: 404 });
  }
  // Buffered: admin request bodies are small JSON documents, and streaming an empty body (a
  // bodiless POST or DELETE, such as sign-out) makes fetch fail.
  const body =
    request.method === "GET" || request.method === "HEAD" ? null : await request.arrayBuffer();
  const upstream = await fetch(`${API_URL}${url.pathname}${url.search}`, {
    method: request.method,
    headers: upstreamRequestHeaders(request),
    ...(body && body.byteLength > 0 && { body }),
    cache: "no-store",
    redirect: "manual",
  });
  const headers = downstreamResponseHeaders(upstream);
  const cleanup = staleCookieCleanup(request.headers.get("cookie"));
  if (cleanup) headers.append("set-cookie", cleanup);
  return new Response(upstream.status === 204 ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
