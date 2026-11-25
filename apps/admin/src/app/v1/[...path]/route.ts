import {
  API_URL,
  downstreamResponseHeaders,
  isAllowedPath,
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
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(`${API_URL}${url.pathname}${url.search}`, {
    method: request.method,
    headers: upstreamRequestHeaders(request),
    ...(hasBody && { body: request.body, duplex: "half" }),
    cache: "no-store",
    redirect: "manual",
  } as RequestInit);
  return new Response(upstream.status === 204 ? null : upstream.body, {
    status: upstream.status,
    headers: downstreamResponseHeaders(upstream),
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
