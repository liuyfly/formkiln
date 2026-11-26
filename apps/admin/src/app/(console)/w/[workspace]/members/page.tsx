import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser, mayAdminister } from "../../../../../lib/session";
import { MembersView } from "./MembersView";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  if (!mayAdminister(await currentUser(), workspace, true)) redirect(`/w/${workspace}/forms`);
  return <MembersView />;
}
