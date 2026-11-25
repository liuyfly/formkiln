import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "../../../lib/session";
import { MembersView } from "./MembersView";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage() {
  const user = await currentUser();
  if (user?.role !== "admin") redirect("/");
  return <MembersView />;
}
