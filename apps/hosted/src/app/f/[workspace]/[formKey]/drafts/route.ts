import {
  formPathOf,
  jsonBody,
  problem,
  relay,
  upstream,
  upstreamHeaders,
} from "../../../../../lib/proxy";

/** formkiln-server stores at most 256 KB of answers per draft. */
const MAX_BODY_BYTES = 300 * 1024;

type Context = { params: Promise<{ workspace: string; formKey: string }> };

async function forward(request: Request, context: Context, method: string, withBody: boolean) {
  const formPath = await formPathOf(context);
  if (!formPath) return problem(404, "Not found");
  let body: string | undefined;
  if (withBody) {
    const read = await jsonBody(request, MAX_BODY_BYTES);
    if (read instanceof Response) return read;
    body = read;
  }
  return relay(
    await upstream(`${formPath}/drafts`, {
      method,
      headers: upstreamHeaders(request, withBody ? { "Content-Type": "application/json" } : {}),
      ...(body !== undefined && { body }),
    }),
  );
}

/** Drafts: create (POST) and, with the `Formkiln-Draft` header, read, save and delete. */
export const POST = (request: Request, context: Context) => forward(request, context, "POST", true);
export const GET = (request: Request, context: Context) => forward(request, context, "GET", false);
export const PUT = (request: Request, context: Context) => forward(request, context, "PUT", true);
export const DELETE = (request: Request, context: Context) =>
  forward(request, context, "DELETE", false);
