import type { Metadata } from "next";
import { SubmissionsView } from "./SubmissionsView";

export const metadata: Metadata = { title: "Submissions" };

export default async function SubmissionsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <SubmissionsView formKey={key} />;
}
