"use client";

import Edit from "@mui/icons-material/Edit";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Link from "@mui/material/Link";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "../../../../../components/Shell";
import { canEdit } from "../../../../../lib/api";

const TABS = [
  { path: "", label: "Submissions" },
  { path: "/versions", label: "Versions" },
  { path: "/sharing", label: "Sharing" },
  { path: "/webhooks", label: "Webhooks" },
];

/** Form title, breadcrumb and section tabs. */
export function FormTabs({ formKey }: { formKey: string }) {
  const pathname = usePathname();
  const editor = canEdit(useUser());
  const base = `/forms/${formKey}`;
  const current = TABS.find((tab) => tab.path && pathname.startsWith(base + tab.path))?.path ?? "";
  return (
    <>
      <Link component={NextLink} href="/forms" variant="body2" underline="hover">
        Forms
      </Link>
      <Stack direction="row" sx={{ alignItems: "center", mt: 0.5, mb: 2, gap: 2 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600, flexGrow: 1 }}>
          {formKey}
        </Typography>
        <Button
          variant="contained"
          startIcon={<Edit />}
          component={NextLink}
          href={`/forms/${formKey}/edit`}
        >
          {editor ? "Edit form" : "Open in builder"}
        </Button>
      </Stack>
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={current}
          variant="scrollable"
          allowScrollButtonsMobile
          aria-label="Form sections"
        >
          {TABS.map((tab) => (
            <Tab
              key={tab.path}
              value={tab.path}
              label={tab.label}
              component={NextLink}
              href={base + tab.path}
            />
          ))}
        </Tabs>
      </Box>
    </>
  );
}
