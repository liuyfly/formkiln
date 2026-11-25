import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Shell } from "../../components/Shell";
import { currentUser } from "../../lib/session";

/** Every console page requires a signed-in member. */
export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  return <Shell user={user}>{children}</Shell>;
}
