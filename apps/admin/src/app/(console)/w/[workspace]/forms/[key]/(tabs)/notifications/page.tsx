import type { Metadata } from "next";
import { NotificationsView } from "./NotificationsView";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <NotificationsView formKey={key} />;
}
