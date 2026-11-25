import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { User } from "./api";
import { API_URL, SESSION_COOKIE } from "./upstream";

/**
 * The signed-in member, checked with formkiln-server on every console page load (once per
 * request, shared by the layout and the page).
 */
export const currentUser = cache(async (): Promise<User | null> => {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!session) return null;
  const forwarded = (await headers()).get("x-forwarded-for");
  const response = await fetch(`${API_URL}/v1/admin/auth/me`, {
    headers: {
      cookie: `${SESSION_COOKIE}=${session}`,
      ...(forwarded && { "x-forwarded-for": forwarded }),
    },
    cache: "no-store",
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error(`formkiln-server returned ${response.status}`);
  return (await response.json()) as User;
});
