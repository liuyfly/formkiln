import { formPathOf, problem, relay, upstream, upstreamHeaders } from "../../../../../lib/proxy";

/** The respondent's receipt PDF; the receipt token comes in the `Formkiln-Receipt` header. */
export async function GET(
  request: Request,
  context: { params: Promise<{ workspace: string; formKey: string }> },
) {
  const formPath = await formPathOf(context);
  if (!formPath) return problem(404, "Not found");
  const locale = new URL(request.url).searchParams.get("locale");
  const query =
    locale && /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(locale) ? `?locale=${locale}` : "";
  return relay(
    await upstream(`${formPath}/receipt${query}`, { headers: upstreamHeaders(request) }),
  );
}
