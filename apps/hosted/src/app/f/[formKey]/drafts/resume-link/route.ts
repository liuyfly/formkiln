import {
  formKeyOf,
  jsonBody,
  problem,
  relay,
  upstream,
  upstreamHeaders,
} from "../../../../../lib/proxy";

/** Asks formkiln-server to email a link to the draft named by the `Formkiln-Draft` header. */
export async function POST(request: Request, context: { params: Promise<{ formKey: string }> }) {
  const formKey = await formKeyOf(context);
  if (!formKey) return problem(404, "Not found");
  const body = await jsonBody(request, 2048);
  if (body instanceof Response) return body;
  return relay(
    await upstream(`/v1/forms/${formKey}/drafts/resume-link`, {
      method: "POST",
      headers: upstreamHeaders(request, { "Content-Type": "application/json" }),
      body,
    }),
  );
}
