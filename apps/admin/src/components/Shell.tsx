"use client";

import GroupOutlined from "@mui/icons-material/GroupOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import Logout from "@mui/icons-material/Logout";
import Menu from "@mui/icons-material/Menu";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { api, type User } from "../lib/api";

const DRAWER_WIDTH = 232;

const UserContext = createContext<User | null>(null);

/** The signed-in member (inside the console). */
export function useUser(): User {
  const user = useContext(UserContext);
  if (!user) throw new Error("useUser must be used inside <Shell>");
  return user;
}

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: <HomeOutlined /> },
  { href: "/members", label: "Members", icon: <GroupOutlined />, adminOnly: true },
  { href: "/settings", label: "Settings", icon: <SettingsOutlined /> },
];

/** Console frame: navigation drawer, top bar with the member and sign-out. */
export function Shell({ user, children }: { user: User; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await api("/v1/admin/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  };

  const nav = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar>
        <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
          Formkiln
        </Typography>
      </Toolbar>
      <Divider />
      <List component="nav" aria-label="Main" sx={{ px: 1 }}>
        {NAV.filter((item) => !item.adminOnly || user.role === "admin").map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <ListItemButton
              key={item.href}
              component={NextLink}
              href={item.href}
              selected={active}
              aria-current={active ? "page" : undefined}
              onClick={() => setOpen(false)}
              sx={{ borderRadius: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <UserContext.Provider value={user}>
      <Box sx={{ display: "flex", minHeight: "100dvh" }}>
        <AppBar
          position="fixed"
          color="inherit"
          elevation={0}
          sx={{
            width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
            ml: { md: `${DRAWER_WIDTH}px` },
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Toolbar>
            <IconButton
              edge="start"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
              sx={{ mr: 1, display: { md: "none" } }}
            >
              <Menu />
            </IconButton>
            <Box sx={{ flexGrow: 1 }} />
            <Box sx={{ textAlign: "right", mr: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {user.email}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user.role}
              </Typography>
            </Box>
            <Tooltip title="Sign out">
              <IconButton aria-label="Sign out" onClick={signOut}>
                <Logout />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
        <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
          <Drawer
            variant="temporary"
            open={open}
            onClose={() => setOpen(false)}
            sx={{
              display: { xs: "block", md: "none" },
              "& .MuiDrawer-paper": { width: DRAWER_WIDTH },
            }}
          >
            {nav}
          </Drawer>
          <Drawer
            variant="permanent"
            open
            sx={{
              display: { xs: "none", md: "block" },
              "& .MuiDrawer-paper": { width: DRAWER_WIDTH },
            }}
          >
            {nav}
          </Drawer>
        </Box>
        <Box
          component="main"
          sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, sm: 3 }, bgcolor: "background.default" }}
        >
          <Toolbar />
          <Box sx={{ maxWidth: 1100, mx: "auto" }}>{children}</Box>
        </Box>
      </Box>
    </UserContext.Provider>
  );
}
