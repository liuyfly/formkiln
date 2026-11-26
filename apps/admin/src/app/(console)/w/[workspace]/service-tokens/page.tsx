import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser, mayAdminister } from "../../../../../lib/session";
import { ServiceTokensView } from "./ServiceTokensView";

export const metadata: Metadata = { title: "Service tokens" };

export default async function ServiceTokensPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  if (!mayAdminister(await currentUser(), workspace, false)) redirect(`/w/${workspace}/forms`);
  return <ServiceTokensView />;
}
