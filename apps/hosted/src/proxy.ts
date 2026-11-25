import { NextResponse } from "next/server";

/**
 * Which sites may embed forms in an iframe: a space-separated CSP `frame-ancestors` source list,
 * for example `https://app.example.com`. Defaults to this site only.
 */
const FRAME_ANCESTORS = sanitize(process.env.FORMKILN_FRAME_ANCESTORS ?? "'self'");

function sanitize(value: string): string {
  // A source list only; never let configuration inject other directives.
  return value.replace(/[;,\r\n]/g, " ").trim() || "'self'";
}

export function proxy() {
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", `frame-ancestors ${FRAME_ANCESTORS}`);
  return response;
}

export const config = {
  matcher: "/:path*",
};
