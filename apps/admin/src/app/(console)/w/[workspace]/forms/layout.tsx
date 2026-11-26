import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { currentUser } from "../../../../../lib/session";

/**
 * Forms are for members, and for instance admins during a read-only access window. Other instance
 * admins manage the workspace's members instead (the server answers 404 for its form data).
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
  const reader =
    user?.workspaces.some((w) => w.slug === workspace) ||
    user?.access?.some((w) => w.slug === workspace);
  if (!reader) redirect(`/w/${workspace}/members`);
  return <>{children}</>;
}
