import type { Metadata } from "next";
import { DataView } from "./DataView";

export const metadata: Metadata = { title: "Data" };

export default async function DataPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <DataView formKey={key} />;
}
