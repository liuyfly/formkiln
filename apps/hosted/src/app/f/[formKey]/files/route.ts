import { formKeyOf, problem, relay, upstream, upstreamHeaders } from "../../../../lib/proxy";

/** Upper bound of an upload request; formkiln-server enforces the real per-field limits. */
const MAX_UPLOAD_BYTES = Number(process.env.FORMKILN_MAX_UPLOAD_BYTES ?? 12 * 1024 * 1024);

/** Streams a multipart upload (`field`, `file`) to formkiln-server. */
export async function POST(request: Request, context: { params: Promise<{ formKey: string }> }) {
  const formKey = await formKeyOf(context);
  if (!formKey) return problem(404, "Not found");
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("multipart/form-data")) return problem(415, "Expected multipart/form-data");
  const length = Number(request.headers.get("content-length"));
  if (!Number.isFinite(length) || length <= 0) return problem(411, "Content-Length required");
  if (length > MAX_UPLOAD_BYTES) return problem(413, "File too large");
  if (!request.body) return problem(400, "Empty request");

  return relay(
    await upstream(`/v1/forms/${formKey}/files`, {
      method: "POST",
      headers: upstreamHeaders(request, { "Content-Type": type }),
      body: request.body,
      // Stream the body instead of buffering it.
      duplex: "half",
    } as RequestInit),
  );
}
