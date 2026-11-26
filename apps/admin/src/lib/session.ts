import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { User } from "./api";
import { API_URL, SESSION_COOKIE } from "./upstream";

/** A GET to formkiln-server with the signed-in member's session (server components only). */
export async function adminFetch(path: string): Promise<Response> {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  const forwarded = (await headers()).get("x-forwarded-for");
  return fetch(`${API_URL}${path}`, {
    headers: {
      ...(session && { cookie: `${SESSION_COOKIE}=${session}` }),
      ...(forwarded && { "x-forwarded-for": forwarded }),
    },
    cache: "no-store",
  });
}

/**
 * Whether the account may open a workspace's admin page: its admins, and for members and the
 * audit log (`instanceAdminToo`) instance admins.
 */
export function mayAdminister(
  user: User | null,
  workspace: string,
  instanceAdminToo: boolean,
): boolean {
  if (!user) return false;
  const role = user.workspaces.find((w) => w.slug === workspace)?.role;
  return role === "admin" || (instanceAdminToo && user.instanceAdmin);
}

/**
 * The signed-in member, checked with formkiln-server on every console page load (once per
 * request, shared by the layout and the page).
 */
export const currentUser = cache(async (): Promise<User | null> => {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!session) return null;
  const response = await adminFetch("/v1/admin/auth/me");
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error(`formkiln-server returned ${response.status}`);
  return (await response.json()) as User;
});
