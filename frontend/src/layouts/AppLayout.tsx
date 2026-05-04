import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import SpaceDashboardOutlinedIcon from "@mui/icons-material/SpaceDashboardOutlined";
import AppBar from "@mui/material/AppBar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha } from "@mui/material/styles";
import { useTheme } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useFinanceApp } from "../context/FinanceAppContext";

export const DRAWER_WIDTH = 280;

const NAV_LINKS: Array<{
  to: string;
  label: string;
  end?: boolean;
  badge?: "review";
  Icon: ComponentType<SvgIconProps>;
}> = [
  { to: "/", label: "Overview", end: true, Icon: SpaceDashboardOutlinedIcon },
  { to: "/connect", label: "Connect & import", Icon: HubOutlinedIcon },
  { to: "/transactions", label: "Transactions", badge: "review", Icon: ReceiptLongOutlinedIcon },
  { to: "/cashflow", label: "Cashflow", Icon: CalendarMonthOutlinedIcon },
  { to: "/debts", label: "Debts & loans", Icon: CreditCardOutlinedIcon },
  { to: "/savings", label: "Savings", Icon: SavingsOutlinedIcon },
  { to: "/insights", label: "Insights", Icon: InsightsOutlinedIcon },
  { to: "/accounts", label: "Accounts", Icon: AccountBalanceWalletOutlinedIcon },
];

export default function AppLayout() {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  const location = useLocation();
  const {
    error,
    setError,
    snackbarOpen,
    setSnackbarOpen,
    snackbarMessage,
    reviewTransactions,
  } = useFinanceApp();

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen((open) => !open);
  }, []);

  useLayoutEffect(() => {
    mainRef.current?.focus();
  }, [location.pathname]);

  const drawer = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar sx={{ px: 2, py: 1.5, alignItems: "flex-start", flexDirection: "column", gap: 0.25 }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
          Finaryo
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Personal finance
        </Typography>
      </Toolbar>
      <Divider />
      <List component="nav" dense sx={{ px: 1, py: 1.5, flex: 1 }} aria-label="Primary">
        {NAV_LINKS.map((item) => {
          const Icon = item.Icon;
          const reviewCount = item.badge === "review" ? reviewTransactions.length : 0;
          const label =
            reviewCount > 0 ? (
              <Badge color="warning" badgeContent={reviewCount} sx={{ "& .MuiBadge-badge": { right: -12 } }}>
                <span>{item.label}</span>
              </Badge>
            ) : (
              item.label
            );
          return (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                py: 1,
                px: 1.25,
                color: "text.primary",
                "& .MuiListItemIcon-root": {
                  color: "text.secondary",
                  minWidth: 40,
                },
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                  "& .MuiListItemIcon-root": { color: "primary.light" },
                },
                "&.active": {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  borderLeft: `3px solid ${theme.palette.primary.main}`,
                  marginLeft: "-1px",
                  paddingLeft: `calc(${theme.spacing(1.25)} - 2px)`,
                  color: "primary.main",
                  "& .MuiListItemIcon-root": {
                    color: "primary.main",
                  },
                  "& .MuiTypography-root": {
                    fontWeight: 600,
                  },
                },
              }}
            >
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={label} slotProps={{ primary: { variant: "body2", sx: { lineHeight: 1.35 } } }} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh", bgcolor: "background.default" }}>
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: "absolute",
          top: "0.4rem",
          left: "0.5rem",
          transform: "translateY(-180%)",
          bgcolor: "primary.main",
          color: "primary.contrastText",
          px: 1.25,
          py: 0.75,
          borderRadius: 1,
          zIndex: 10,
          typography: "body2",
          fontWeight: 600,
          textDecoration: "none",
          "&:focus-visible": {
            transform: "translateY(0)",
            outline: `2px solid ${theme.palette.primary.dark}`,
            outlineOffset: 2,
          },
        }}
      >
        Skip to content
      </Box>

      <AppBar
        position="sticky"
        color="default"
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          display: { md: "none" },
          backdropFilter: "blur(12px)",
          backgroundColor: alpha(theme.palette.background.paper, 0.92),
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56 } }}>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} aria-label="Open navigation menu">
            <MenuIcon />
          </IconButton>
          <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: "-0.02em" }}>
            Finaryo
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMdUp ? "permanent" : "temporary"}
        open={isMdUp ? true : mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        aria-label="Primary navigation"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        {drawer}
      </Drawer>

      <Box
        ref={mainRef}
        id="main-content"
        component="main"
        tabIndex={-1}
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          overflow: "auto",
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            maxWidth: 1320,
            mx: "auto",
            p: { xs: 2, sm: 3, md: 4 },
            border: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06), 0 4px 24px rgba(15, 23, 42, 0.04)",
          }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <Outlet />
        </Paper>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}
