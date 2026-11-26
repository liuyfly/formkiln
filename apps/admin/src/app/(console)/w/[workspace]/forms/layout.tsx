import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { currentUser } from "../../../../../lib/session";

/**
 * Forms are for members. Instance admins who are not members manage the workspace's members
 * instead (the server answers 404 for its form data anyway).
 */
export default async function FormsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const user = await currentUser();
  if (!user?.workspaces.some((w) => w.slug === workspace)) redirect(`/w/${workspace}/members`);
  return <>{children}</>;
}
