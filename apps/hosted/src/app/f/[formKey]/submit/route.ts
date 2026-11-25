import { API_URL, isFormKey } from "../../../../lib/api";

/** Submissions larger than this are rejected before reaching formkiln-server. */
const MAX_BODY_BYTES = 512 * 1024;

/**
 * Forwards a submission to formkiln-server. The browser only talks to this app, so the server
 * URL stays private and no CORS configuration is needed. The server re-validates everything.
 */
export async function POST(request: Request, context: { params: Promise<{ formKey: string }> }) {
  const { formKey } = await context.params;
  if (!isFormKey(formKey)) return Response.json({ title: "Not found" }, { status: 404 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ title: "Expected application/json" }, { status: 415 });
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
    return Response.json({ title: "Submission too large" }, { status: 413 });
  }

  const upstream = await fetch(`${API_URL}/v1/forms/${formKey}/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
