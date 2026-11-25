"use client";

import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { path: "", label: "Submissions" },
  { path: "/versions", label: "Versions" },
  { path: "/sharing", label: "Sharing" },
  { path: "/webhooks", label: "Webhooks" },
];

/** Form title, breadcrumb and section tabs. */
export function FormTabs({ formKey }: { formKey: string }) {
  const pathname = usePathname();
  const base = `/forms/${formKey}`;
  const current = TABS.find((tab) => tab.path && pathname.startsWith(base + tab.path))?.path ?? "";
  return (
    <>
      <Link component={NextLink} href="/forms" variant="body2" underline="hover">
        Forms
      </Link>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mt: 0.5, mb: 2 }}>
        {formKey}
      </Typography>
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
