import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

/** Centered card for sign-in, invitation and password reset pages. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        p: 2,
        bgcolor: "background.default",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 420 }}>
        <Typography variant="h6" component="p" sx={{ fontWeight: 700, mb: 2, textAlign: "center" }}>
          Formkiln
        </Typography>
        <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 } }}>
          {children}
        </Paper>
      </Box>
    </Box>
  );
}
