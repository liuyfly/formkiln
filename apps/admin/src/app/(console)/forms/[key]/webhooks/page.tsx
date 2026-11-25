import type { Metadata } from "next";
import { WebhooksView } from "./WebhooksView";

export const metadata: Metadata = { title: "Webhooks" };

export default async function WebhooksPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <WebhooksView formKey={key} />;
}
