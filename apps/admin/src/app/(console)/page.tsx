import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import NextLink from "next/link";
import { PageHeader } from "../../components/PageHeader";
import { currentUser } from "../../lib/session";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const user = await currentUser();
  const links = [
    ...(user?.role === "admin"
      ? [{ href: "/members", title: "Members", text: "Invite people and manage roles." }]
      : []),
    { href: "/settings", title: "Settings", text: "Password, recovery codes and active sessions." },
  ];
  return (
    <>
      <PageHeader title="Welcome" description={`Signed in as ${user?.email ?? ""}.`} />
      <Grid container spacing={2}>
        {links.map((link) => (
          <Grid key={link.href} size={{ xs: 12, sm: 6 }}>
            <Card variant="outlined">
              <CardActionArea component={NextLink} href={link.href}>
                <CardContent>
                  <Typography variant="h6" component="h2">
                    {link.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {link.text}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
