import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser, mayAdminister } from "../../../../../lib/session";
import { AuditView } from "./AuditView";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  if (!mayAdminister(await currentUser(), workspace, true)) redirect(`/w/${workspace}/forms`);
  return <AuditView />;
}
