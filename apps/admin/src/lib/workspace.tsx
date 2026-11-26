"use client";

import { createContext, useContext, type ReactNode } from "react";
import { adminApi, manageApi, type Role } from "./api";

/** The workspace a console page belongs to, and the signed-in account's role in it. */
export interface WorkspaceAccess {
  slug: string;
  name: string;
  /** Null for an instance admin who manages the workspace without being a member. */
  role: Role | null;
  archived: boolean;
  /** Set when an instance admin reads the workspace through a read-only access window. */
  readOnlyUntil?: string;
}

export interface Workspace extends WorkspaceAccess {
  /** Base path of the workspace's management API. */
  manage: string;
  /** Base path of the workspace's administration API. */
  admin: string;
  /** A console path within the workspace, such as `href("/forms")`. */
  href: (path: string) => string;
}

const WorkspaceContext = createContext<Workspace | null>(null);

export function WorkspaceProvider({
  access,
  children,
}: {
  access: WorkspaceAccess;
  children: ReactNode;
}) {
  const value: Workspace = {
    ...access,
    manage: manageApi(access.slug),
    admin: adminApi(access.slug),
    href: (path) => `/w/${access.slug}${path}`,
  };
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

/** The workspace of the current console page. */
export function useWorkspace(): Workspace {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error("useWorkspace must be used inside a workspace page");
  return workspace;
}
