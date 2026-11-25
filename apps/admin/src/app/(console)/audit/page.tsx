import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "../../../lib/session";
import { AuditView } from "./AuditView";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage() {
  const user = await currentUser();
  if (user?.role !== "admin") redirect("/");
  return <AuditView />;
}
