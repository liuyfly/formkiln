import Typography from "@mui/material/Typography";
import { redirect } from "next/navigation";
import { PageHeader } from "../../components/PageHeader";
import { currentUser } from "../../lib/session";

/** Opens the first workspace of the account; accounts without one see how to get access. */
export default async function HomePage() {
  const user = await currentUser();
  const first = user?.workspaces.find((w) => !w.archived) ?? user?.workspaces[0];
  if (first) redirect(`/w/${first.slug}/forms`);
  return (
    <>
      <PageHeader title="No workspace yet" />
      <Typography color="text.secondary">
        You are not a member of any workspace yet. Ask an admin of your team to add you.
      </Typography>
    </>
  );
}
