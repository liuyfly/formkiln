import {
  formPathOf,
  jsonBody,
  problem,
  relay,
  upstream,
  upstreamHeaders,
} from "../../../../../../lib/proxy";

/** Asks formkiln-server to email a link to the draft named by the `Formkiln-Draft` header. */
export async function POST(
  request: Request,
  context: { params: Promise<{ workspace: string; formKey: string }> },
) {
  const formPath = await formPathOf(context);
  if (!formPath) return problem(404, "Not found");
  const body = await jsonBody(request, 2048);
  if (body instanceof Response) return body;
  return relay(
    await upstream(`${formPath}/drafts/resume-link`, {
      method: "POST",
      headers: upstreamHeaders(request, { "Content-Type": "application/json" }),
      body,
    }),
  );
}
