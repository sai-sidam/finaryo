import { createTheme } from "@mui/material/styles";

/**
 * Material UI — light-only finance theme (blue primary, teal secondary).
 * Prefer theme.spacing (8px grid) and semantic palette tokens.
 * @see https://mui.com/material-ui/customization/theming/
 */
export const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: "#1565c0",
          dark: "#0d47a1",
          light: "#42a5f5",
        },
        secondary: {
          main: "#00897b",
          dark: "#00695c",
          light: "#4db6ac",
        },
        background: {
          default: "#ebf1f8",
          paper: "#ffffff",
        },
      },
    },
  },
  defaultColorScheme: "light",
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Roboto Flex", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      letterSpacing: "-0.025em",
      lineHeight: 1.25,
    },
    h5: {
      fontWeight: 600,
      letterSpacing: "-0.02em",
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 600,
    },
    subtitle2: {
      fontWeight: 600,
      letterSpacing: "0.02em",
    },
    body2: {
      lineHeight: 1.5,
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: "1.25rem",
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: Number(theme.shape.borderRadius),
          transition: theme.transitions.create(["box-shadow", "border-color"], {
            duration: theme.transitions.duration.shortest,
          }),
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: "divider",
        },
        head: {
          fontWeight: 600,
          fontSize: "0.8125rem",
          letterSpacing: "0.02em",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.palette.grey[50],
          borderRight: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 44,
        },
        indicator: ({ theme }) => ({
          height: 3,
          borderRadius: "3px 3px 0 0",
          backgroundColor: theme.palette.primary.main,
        }),
      },
    },
    MuiTab: {
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: "none",
          fontWeight: 600,
          minHeight: 44,
          "&.Mui-selected": {
            color: theme.palette.primary.main,
          },
        }),
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
          height: 6,
        }),
      },
    },
  },
});
