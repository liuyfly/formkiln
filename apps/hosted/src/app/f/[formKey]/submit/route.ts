import {
  formKeyOf,
  jsonBody,
  problem,
  relay,
  upstream,
  upstreamHeaders,
} from "../../../../lib/proxy";

/** Submissions larger than this are rejected before reaching formkiln-server. */
const MAX_BODY_BYTES = 512 * 1024;

/**
 * Forwards a submission to formkiln-server. The browser only talks to this app, so the server
 * URL stays private and no CORS configuration is needed. The server re-validates everything.
 */
export async function POST(request: Request, context: { params: Promise<{ formKey: string }> }) {
  const formKey = await formKeyOf(context);
  if (!formKey) return problem(404, "Not found");
  const body = await jsonBody(request, MAX_BODY_BYTES);
  if (body instanceof Response) return body;
  return relay(
    await upstream(`/v1/forms/${formKey}/submissions`, {
      method: "POST",
      headers: upstreamHeaders(request, { "Content-Type": "application/json" }),
      body,
    }),
  );
}
