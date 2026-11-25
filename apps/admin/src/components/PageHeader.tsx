import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 3, flexWrap: "wrap" }}>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
  );
}
