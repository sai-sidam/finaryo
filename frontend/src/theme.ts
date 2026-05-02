import { createTheme } from "@mui/material/styles";

/**
 * Material UI with Material Design 3–oriented defaults:
 * CSS variables, light/dark schemes, elevated surfaces, Roboto Flex (see main.tsx).
 */
export const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    dark: true,
    light: true,
  },
  defaultColorScheme: "dark",
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Roboto Flex", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      letterSpacing: "-0.02em",
    },
    h6: {
      fontWeight: 600,
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
  },
});
