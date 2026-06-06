/**
 * Visual design tokens (light-mode pastel, minimalistic professional).
 *
 * _Requirements: 23.1, 23.2_
 */

export const theme = {
  colors: {
    bg: "#F6F7FB",
    bgAccent: "#F0EEFB",
    surface: "#FFFFFF",
    surfaceAlt: "#F4F5FA",
    border: "#ECEDF4",
    borderStrong: "#E0E2EC",
    text: "#23263A",
    textMuted: "#7A7F95",
    textSoft: "#9AA0B4",
    primary: "#7C6CF0", // soft violet (matches mockup accent)
    primaryHover: "#6A58EC",
    primarySoft: "#ECE9FE",
    success: "#5FBF8E",
    successSoft: "#E3F5EC",
    warning: "#E7A948",
    warningSoft: "#FCEFD7",
    danger: "#E57B7B",
    dangerSoft: "#FBE6E6",
  },
  radius: {
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "22px",
  },
  shadow: {
    card: "0 1px 2px rgba(35, 38, 58, 0.04), 0 4px 16px rgba(35, 38, 58, 0.05)",
    pop: "0 8px 28px rgba(35, 38, 58, 0.14)",
  },
  spacing: (n: number) => `${n * 4}px`,
  font: {
    family:
      "'Inter', 'Segoe UI', system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif",
    size: {
      xs: "11px",
      sm: "12px",
      base: "13px",
      md: "14px",
      lg: "16px",
      xl: "20px",
      xxl: "26px",
    },
  },
} as const;

export type Theme = typeof theme;
