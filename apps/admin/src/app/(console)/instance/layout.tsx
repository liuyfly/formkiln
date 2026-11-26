import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { currentUser } from "../../../lib/session";

/** Instance administration: workspaces, accounts and the instance-wide audit log. */
export default async function InstanceLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  if (!user?.instanceAdmin) redirect("/");
  return <>{children}</>;
}
