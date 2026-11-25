import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const config: NextConfig = {
  // A self-contained server bundle for container images.
  output: "standalone",
  // Trace files from the monorepo root so workspace packages are included in the bundle.
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
  poweredByHeader: false,
  // Framing is controlled at runtime by src/proxy.ts (FORMKILN_FRAME_ANCESTORS).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Hosted forms are shared by link and must not be indexed (Form Schema hosted mode).
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default config;
