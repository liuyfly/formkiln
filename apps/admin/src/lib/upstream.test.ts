import { describe, expect, it } from "vitest";
import {
  downstreamResponseHeaders,
  isAllowedPath,
  sessionCookie,
  upstreamRequestHeaders,
} from "./upstream";

describe("admin gateway", () => {
  it("only reaches the admin and management API", () => {
    expect(isAllowedPath("/v1/admin/auth/me")).toBe(true);
    expect(isAllowedPath("/v1/manage/forms")).toBe(true);
    expect(isAllowedPath("/v1/forms/contact")).toBe(false);
    expect(isAllowedPath("/actuator/health")).toBe(false);
    expect(isAllowedPath("/v1/admin/../forms/x")).toBe(false);
    expect(isAllowedPath("/v1/admin//x")).toBe(false);
  });

  it("forwards only the session cookie and selected headers", () => {
    const request = new Request("http://admin.test/v1/admin/auth/me", {
      headers: {
        cookie: "theme=dark; formkiln_session=abc=def; other=1",
        authorization: "Bearer service-token",
        "x-requested-with": "formkiln",
        "x-forwarded-for": "203.0.113.5",
        "content-type": "application/json",
      },
    });
    const headers = upstreamRequestHeaders(request);
    expect(headers.get("cookie")).toBe("formkiln_session=abc=def");
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("x-requested-with")).toBe("formkiln");
    expect(headers.get("x-forwarded-for")).toBe("203.0.113.5");
    expect(sessionCookie(null)).toBeNull();
  });

  it("relays the session cookie and safe response headers", () => {
    const upstream = new Response("{}", {
      headers: [
        ["content-type", "application/json"],
        ["set-cookie", "formkiln_session=t; Path=/v1; HttpOnly; SameSite=Strict"],
        ["set-cookie", "tracking=1"],
        ["x-internal", "secret"],
      ],
    });
    const headers = downstreamResponseHeaders(upstream);
    expect(headers.getSetCookie()).toEqual([
      "formkiln_session=t; HttpOnly; SameSite=Strict; Path=/",
    ]);
    expect(headers.get("x-internal")).toBeNull();
    expect(headers.get("cache-control")).toBe("no-store");
  });
});
