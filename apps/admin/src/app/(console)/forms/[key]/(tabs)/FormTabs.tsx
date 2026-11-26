"use client";

import ContentCopy from "@mui/icons-material/ContentCopy";
import Edit from "@mui/icons-material/Edit";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Link from "@mui/material/Link";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CreateFormDialog } from "../../../../../components/CreateFormDialog";
import { FormMenu } from "../../../../../components/FormMenu";
import { useUser } from "../../../../../components/Shell";
import { api, canEdit, errorMessage, isAdmin } from "../../../../../lib/api";
import { useFormSummary } from "../../../../../lib/useFormSummary";

const TABS = [
  { path: "", label: "Submissions" },
  { path: "/versions", label: "Versions" },
  { path: "/sharing", label: "Sharing" },
  { path: "/webhooks", label: "Webhooks" },
  { path: "/notifications", label: "Notifications" },
  { path: "/data", label: "Data" },
];

/** Form title, breadcrumb and section tabs. */
export function FormTabs({ formKey }: { formKey: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUser();
  const editor = canEdit(user);
  const [duplicating, setDuplicating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { form, folder, reload } = useFormSummary(formKey);
  const archived = form?.archivedAt != null;
  const base = `/forms/${formKey}`;
  const current = TABS.find((tab) => tab.path && pathname.startsWith(base + tab.path))?.path ?? "";
  return (
    <>
      <Breadcrumbs aria-label="Location">
        <Link component={NextLink} href="/forms" variant="body2" underline="hover">
          Forms
        </Link>
        {folder && (
          <Link
            component={NextLink}
            href={`/forms?folder=${folder.id}`}
            variant="body2"
            underline="hover"
          >
            {folder.name}
          </Link>
        )}
        {archived && (
          <Link component={NextLink} href="/forms?view=archived" variant="body2" underline="hover">
            Archived
          </Link>
        )}
      </Breadcrumbs>
      <Stack direction="row" sx={{ alignItems: "center", mt: 0.5, mb: 2, gap: 2 }}>
        <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            {form?.title || formKey}
          </Typography>
          {form?.title && (
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>
              {formKey}
            </Typography>
          )}
        </Stack>
        {editor && !archived && (
          <Button
            variant="outlined"
            startIcon={<ContentCopy />}
            onClick={() => setDuplicating(true)}
          >
            Duplicate
          </Button>
        )}
        <Button
          variant="contained"
          startIcon={<Edit />}
          component={NextLink}
          href={`/forms/${formKey}/edit`}
        >
          {editor && !archived ? "Edit form" : "Open in builder"}
        </Button>
        {form && !archived && (
          <FormMenu
            formKey={formKey}
            folderId={form.folderId}
            onMoved={() => void reload()}
            onArchived={() => router.push("/forms?view=archived")}
            onError={setError}
          />
        )}
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {archived && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            isAdmin(user) && (
              <Button
                color="inherit"
                size="small"
                onClick={() =>
                  api(`/v1/manage/forms/${formKey}/restore`, { method: "POST" }).then(
                    () => void reload(),
                    (failure) => setError(errorMessage(failure)),
                  )
                }
              >
                Restore
              </Button>
            )
          }
        >
          This form is archived: respondents cannot open or submit it, and it cannot be published.
          Its submissions are kept.
        </Alert>
      )}
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
      <CreateFormDialog
        open={duplicating}
        onClose={() => setDuplicating(false)}
        duplicateOf={formKey}
      />
    </>
  );
}
