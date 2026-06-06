/**
 * Visual design tokens (light-mode pastel, minimalistic professional).
 *
 * _Requirements: 23.1, 23.2_
 */

export const theme = {
  colors: {
    bg: "#F7F8FC",
    surface: "#FFFFFF",
    surfaceAlt: "#F1F3FA",
    border: "#E6E9F2",
    text: "#2B2F42",
    textMuted: "#6B7088",
    primary: "#8B7DF0", // soft violet (matches mockup accent)
    primarySoft: "#EAE6FB",
    success: "#7CC9A0",
    warning: "#E9B45A",
    danger: "#E58A8A",
  },
  radius: {
    sm: "8px",
    md: "12px",
    lg: "18px",
  },
  shadow: {
    card: "0 1px 3px rgba(43, 47, 66, 0.06), 0 1px 2px rgba(43, 47, 66, 0.04)",
  },
  spacing: (n: number) => `${n * 4}px`,
  font: {
    family:
      "'Inter', 'Segoe UI', system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif",
  },
} as const;

export type Theme = typeof theme;
