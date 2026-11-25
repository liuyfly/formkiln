import "server-only";
import { API_URL, isEmbedToken, isFormKey } from "./api";

/** Request headers passed on to formkiln-server. */
const DRAFT_TOKEN = /^[A-Za-z0-9_-]{16,128}$/;

/**
 * Headers for an upstream request: the embed token, the draft token and the client address.
 * `X-Forwarded-For` is passed on unchanged; formkiln-server trusts it only from private-network
 * proxies and takes the right-most public address, so run this app behind a reverse proxy that
 * appends the client address.
 */
export function upstreamHeaders(request: Request, extra: Record<string, string> = {}): Headers {
  const headers = new Headers(extra);
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ") && isEmbedToken(authorization.slice(7))) {
    headers.set("Authorization", authorization);
  }
  const draft = request.headers.get("formkiln-draft");
  if (draft && DRAFT_TOKEN.test(draft)) headers.set("Formkiln-Draft", draft);
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) headers.set("X-Forwarded-For", forwarded);
  return headers;
}

/** Copies an upstream response, keeping only its status, body and content type. */
export function relay(upstream: Response): Response {
  const headers: Record<string, string> = {};
  const type = upstream.headers.get("content-type");
  if (type) headers["Content-Type"] = type;
  const retry = upstream.headers.get("retry-after");
  if (retry) headers["Retry-After"] = retry;
  return new Response(upstream.status === 204 ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
}

export function problem(status: number, title: string): Response {
  return Response.json({ status, title }, { status });
}

export async function formKeyOf(context: { params: Promise<{ formKey: string }> }) {
  const { formKey } = await context.params;
  return isFormKey(formKey) ? formKey : null;
}

/** Reads a JSON body up to `limit` bytes, or returns an error response. */
export async function jsonBody(request: Request, limit: number): Promise<string | Response> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return problem(415, "Expected application/json");
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > limit) return problem(413, "Request too large");
  return body;
}

export function upstream(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, { ...init, cache: "no-store" });
}
