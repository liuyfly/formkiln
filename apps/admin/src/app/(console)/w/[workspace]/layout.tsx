import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { adminFetch, currentUser } from "../../../../lib/session";
import { WorkspaceProvider } from "../../../../lib/workspace";

/**
 * Pages of one workspace. Members see it with their role; instance admins who are not members
 * can manage its members and read its audit log (the server enforces the same).
 */
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const user = await currentUser();
  const membership = user?.workspaces.find((w) => w.slug === workspace);
  if (membership) {
    return (
      <WorkspaceProvider
        access={{
          slug: membership.slug,
          name: membership.name,
          role: membership.role,
          archived: membership.archived,
        }}
      >
        {children}
      </WorkspaceProvider>
    );
  }
  if (!user?.instanceAdmin) notFound();
  const found = await workspaceOf(workspace);
  if (!found) notFound();
  return <WorkspaceProvider access={{ ...found, role: null }}>{children}</WorkspaceProvider>;
}

async function workspaceOf(slug: string) {
  const response = await adminFetch(`/v1/admin/workspaces/${encodeURIComponent(slug)}`);
  if (!response.ok) return null;
  const body = (await response.json()) as {
    workspace: { slug: string; name: string; archivedAt: string | null };
  };
  return {
    slug: body.workspace.slug,
    name: body.workspace.name,
    archived: body.workspace.archivedAt !== null,
  };
}
