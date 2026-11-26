import type { Metadata } from "next";
import { WorkspacesView } from "./WorkspacesView";

export const metadata: Metadata = { title: "Workspaces" };

export default function WorkspacesPage() {
  return <WorkspacesView />;
}
