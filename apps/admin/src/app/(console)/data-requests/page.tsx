import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "../../../lib/session";
import { DataRequestsView } from "./DataRequestsView";

export const metadata: Metadata = { title: "Data requests" };

export default async function DataRequestsPage() {
  const user = await currentUser();
  if (user?.role !== "admin") redirect("/");
  return <DataRequestsView />;
}
