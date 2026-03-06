export const lightColors = {
  background: "#F8FAFC",
  bgDeep: "#E2E8F0", // or F1F5F9 for subtle grey
  bgMid: "#F1F5F9",
  bgCard: "#FFFFFF",
  bgCardAlt: "#F8FAFC",
  textPrimary: "#0F172A",
  textMuted: "#475569",
  textDim: "#64748B",
  accentTeal: "#10B981",
  accentCoral: "#EF4444",
  accentAmber: "#F59E0B",
  accentIndigo: "#6366F1",
  accentBlue: "#3B82F6",
  danger: "#EF4444",
  safe: "#10B981",
  warning: "#F5A524",
  border: "#E2E8F0",
  iconPrimary: "#111827",
  iconInvert: "#FFFFFF",
  cardShadow: "#000000",
};

export const darkColors = {
  background: "#0B1021",
  bgDeep: "#0B1021",
  bgMid: "#102A43",
  bgCard: "#121B2D",
  bgCardAlt: "#16213A",
  textPrimary: "#F8FAFC",
  textMuted: "#B9C2D3",
  textDim: "#8B97AB",
  accentTeal: "#00D2A8",
  accentCoral: "#FF7A59",
  accentAmber: "#FFB020",
  accentIndigo: "#818CF8",
  accentBlue: "#5AA9FF",
  danger: "#FF4D4F",
  safe: "#26C281",
  warning: "#F5A524",
  border: "#22304B",
  iconPrimary: "#F8FAFC",
  iconInvert: "#111827",
  cardShadow: "#000000",
};

export type ThemeColors = typeof lightColors;

// Maintain backward compatibility during transition
export const colors = darkColors;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  xxl: 36,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
};

export const typography = {
  title: 28,
  h2: 22,
  h3: 18,
  body: 16,
  small: 13,
};
