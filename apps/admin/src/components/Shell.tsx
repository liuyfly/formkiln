"use client";

import GroupOutlined from "@mui/icons-material/GroupOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import HistoryOutlined from "@mui/icons-material/HistoryOutlined";
import PersonRemoveOutlined from "@mui/icons-material/PersonRemoveOutlined";
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
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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
  /** Who sees it: every member, workspace admins, or also instance admins who are not members. */
  access: "member" | "admin" | "adminOrInstance";
}

/** Pages of a workspace (under `/w/{slug}`). */
const WORKSPACE_NAV: NavItem[] = [
  { href: "/forms", label: "Forms", icon: <DescriptionOutlined />, access: "member" },
  { href: "/members", label: "Members", icon: <GroupOutlined />, access: "adminOrInstance" },
  { href: "/audit", label: "Audit log", icon: <HistoryOutlined />, access: "adminOrInstance" },
  {
    href: "/data-requests",
    label: "Data requests",
    icon: <PersonRemoveOutlined />,
    access: "admin",
  },
];

const ACCOUNT_NAV: NavItem[] = [
  { href: "/settings", label: "Settings", icon: <SettingsOutlined />, access: "member" },
];

/** The workspace slug of a console path (`/w/{slug}/...`), if any. */
function workspaceOf(pathname: string): string | null {
  return /^\/w\/([^/]+)/.exec(pathname)?.[1] ?? null;
}

/** The workspace to show in the navigation: the one open, else the last one used. */
function useCurrentWorkspace(user: User, pathname: string): string | null {
  const fromPath = workspaceOf(pathname);
  const [last, setLast] = useState<string | null>(null);
  useEffect(() => {
    if (fromPath) setLast(fromPath);
  }, [fromPath]);
  return fromPath ?? last ?? user.workspaces[0]?.slug ?? null;
}

/** Console frame: navigation drawer, top bar with the member and sign-out. */
export function Shell({ user, children }: { user: User; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const current = useCurrentWorkspace(user, pathname);
  const membership = user.workspaces.find((w) => w.slug === current) ?? null;
  const role = membership?.role ?? null;
  const visible = (item: NavItem) =>
    item.access === "member"
      ? membership !== null
      : role === "admin" || (item.access === "adminOrInstance" && user.instanceAdmin);
  const items = [
    ...(current
      ? WORKSPACE_NAV.filter(visible).map((item) => ({
          ...item,
          href: `/w/${current}${item.href}`,
        }))
      : []),
    ...ACCOUNT_NAV,
  ];

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
      {user.workspaces.length > 0 && (
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <TextField
            select
            size="small"
            fullWidth
            label="Workspace"
            value={current ?? ""}
            onChange={(event) => {
              setOpen(false);
              router.push(`/w/${event.target.value}/forms`);
            }}
          >
            {current && !membership && (
              <MenuItem value={current} disabled>
                {current}
              </MenuItem>
            )}
            {user.workspaces.map((w) => (
              <MenuItem key={w.slug} value={w.slug}>
                {w.name}
                {w.archived ? " (archived)" : ""}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      )}
      <List component="nav" aria-label="Main" sx={{ px: 1 }}>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                {role ?? (user.instanceAdmin ? "instance admin" : "")}
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
          <Box sx={{ maxWidth: pathname.endsWith("/edit") ? "none" : 1100, mx: "auto" }}>
            {children}
          </Box>
        </Box>
      </Box>
    </UserContext.Provider>
  );
}
