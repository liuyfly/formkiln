import type { Metadata } from "next";
import { VersionsView } from "./VersionsView";

export const metadata: Metadata = { title: "Versions" };

export default async function VersionsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <VersionsView formKey={key} />;
}
