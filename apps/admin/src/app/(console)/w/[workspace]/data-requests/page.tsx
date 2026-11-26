import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser, mayAdminister } from "../../../../../lib/session";
import { DataRequestsView } from "./DataRequestsView";

export const metadata: Metadata = { title: "Data requests" };

export default async function DataRequestsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  if (!mayAdminister(await currentUser(), workspace, false)) redirect(`/w/${workspace}/forms`);
  return <DataRequestsView />;
}
