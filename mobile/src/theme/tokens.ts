import { Platform } from "react-native";

// ── 1. Primitive Palette ────────────────────────────────────────────────────

export const palette = {
  navy950: "#060F1D",
  navy900: "#0A1628",
  navy800: "#111E30",
  navy750: "#16253A",
  navy700: "#1E3048",
  navy600: "#2B405D",

  cream50: "#FAF8F4",
  cream100: "#F8F6F1",
  cream200: "#EFECE4",
  cream300: "#E2DDD6",
  white: "#FFFFFF",

  gold600: "#856214",
  gold500: "#A8873A",
  gold400: "#C9A84C",
  gold300: "#DFBF66",
  gold100: "#F6EED9",

  slate700: "#334155",
  slate600: "#475569",
  slate500: "#5C6B7E",
  slate400: "#7E92AA",
  slate300: "#A3B3C6",

  green700: "#047857",
  green600: "#059669",
  green400: "#34D399",
  green100: "#DCFCE7",
  green950: "#09261C",

  blue700: "#1D4ED8",
  blue600: "#2563EB",
  blue400: "#60A5FA",
  blue100: "#DBEAFE",
  blue950: "#0F1E3A",

  purple700: "#6D28D9",
  purple600: "#7C3AED",
  purple400: "#A78BFA",
  purple100: "#EDE9FE",
  purple950: "#1F1438",

  red700: "#B91C1C",
  red600: "#DC2626",
  red400: "#F87171",
  red100: "#FEE2E2",
  red950: "#2C1014",

  gray600: "#4B5563",
  gray400: "#9CA3AF",
  gray200: "#E5E7EB",
  gray800: "#1F2937",
} as const;

// ── 2. Semantic Tokens (Light & Dark — WCAG AA >= 4.5:1 verified) ──────────

export interface StatusPalette {
  fg: string;
  bg: string;
  accent: string;
}

export type InvoiceStatusKey =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceElevated: string;
  surfacePressed: string;
  inputBg: string;

  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  border: string;
  borderSubtle: string;
  borderFocus: string;

  accent: string;
  accentText: string;
  accentSoft: string;
  onAccent: string;

  headerBg: string;
  headerText: string;
  headerBorder: string;

  tabBarBg: string;
  tabBarBorder: string;
  tabActive: string;
  tabInactive: string;

  danger: string;
  dangerBg: string;
  success: string;
  successBg: string;
  info: string;
  infoBg: string;
  warning: string;

  skeletonBase: string;
  skeletonHighlight: string;
  scrim: string;
  ripple: string;

  status: Record<InvoiceStatusKey, StatusPalette>;
}

export const lightColors: ThemeColors = {
  bg: palette.cream100,
  surface: palette.white,
  surfaceElevated: palette.cream200,
  surfacePressed: "#ECE7DD",
  inputBg: palette.white,

  text: palette.navy900,
  textSecondary: palette.slate600,
  textMuted: palette.slate500,
  textInverse: palette.cream100,

  border: palette.cream300,
  borderSubtle: "#EAE5DC",
  borderFocus: palette.gold500,

  accent: palette.gold400,
  accentText: palette.gold600,
  accentSoft: palette.gold100,
  onAccent: palette.navy900,

  headerBg: palette.cream100,
  headerText: palette.navy900,
  headerBorder: palette.cream300,

  tabBarBg: palette.white,
  tabBarBorder: palette.cream300,
  tabActive: palette.navy900,
  tabInactive: palette.slate500,

  danger: palette.red700,
  dangerBg: palette.red100,
  success: palette.green700,
  successBg: palette.green100,
  info: palette.blue700,
  infoBg: palette.blue100,
  warning: palette.gold600,

  skeletonBase: "#E8E3DA",
  skeletonHighlight: "#F4F0E8",
  scrim: "rgba(10, 22, 40, 0.48)",
  ripple: "rgba(10, 22, 40, 0.10)",

  status: {
    DRAFT: { fg: palette.gray600, bg: palette.gray200, accent: palette.gray600 },
    SENT: { fg: palette.blue700, bg: palette.blue100, accent: palette.blue600 },
    VIEWED: { fg: palette.purple700, bg: palette.purple100, accent: palette.purple600 },
    PAID: { fg: palette.green700, bg: palette.green100, accent: palette.green600 },
    OVERDUE: { fg: palette.red700, bg: palette.red100, accent: palette.red600 },
    CANCELLED: { fg: palette.gray600, bg: palette.gray200, accent: palette.gray400 },
  },
};

export const darkColors: ThemeColors = {
  bg: palette.navy900,
  surface: palette.navy800,
  surfaceElevated: palette.navy750,
  surfacePressed: palette.navy700,
  inputBg: palette.navy950,

  text: palette.cream100,
  textSecondary: palette.slate300,
  textMuted: palette.slate400,
  textInverse: palette.navy900,

  border: palette.navy700,
  borderSubtle: "#18283D",
  borderFocus: palette.gold400,

  accent: palette.gold400,
  accentText: palette.gold300,
  accentSoft: "rgba(201, 168, 76, 0.16)",
  onAccent: palette.navy900,

  headerBg: palette.navy900,
  headerText: palette.cream100,
  headerBorder: palette.navy700,

  tabBarBg: palette.navy950,
  tabBarBorder: palette.navy700,
  tabActive: palette.gold300,
  tabInactive: palette.slate400,

  danger: palette.red400,
  dangerBg: palette.red950,
  success: palette.green400,
  successBg: palette.green950,
  info: palette.blue400,
  infoBg: palette.blue950,
  warning: palette.gold300,

  skeletonBase: "#16263C",
  skeletonHighlight: "#223652",
  scrim: "rgba(0, 6, 15, 0.68)",
  ripple: "rgba(248, 246, 241, 0.12)",

  status: {
    DRAFT: { fg: "#CBD5E1", bg: "#1E293B", accent: "#94A3B8" },
    SENT: { fg: "#93C5FD", bg: palette.blue950, accent: palette.blue400 },
    VIEWED: { fg: "#C4B5FD", bg: palette.purple950, accent: palette.purple400 },
    PAID: { fg: "#6EE7B7", bg: palette.green950, accent: palette.green400 },
    OVERDUE: { fg: "#FCA5A5", bg: palette.red950, accent: palette.red400 },
    CANCELLED: { fg: "#CBD5E1", bg: "#1E293B", accent: "#64748B" },
  },
};

// ── 3. Layout, Spacing, Radius, Typography & Motion Tokens ─────────────────

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
} as const;

export const touchTarget = {
  minHeight: Platform.OS === "android" ? 48 : 44,
  minWidth: Platform.OS === "android" ? 48 : 44,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
} as const;

/** System fonts only so iOS SF Pro & Android Roboto + Dynamic Type scaling work natively. */
export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: "700" as const, letterSpacing: -0.4 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "700" as const, letterSpacing: -0.3 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: "600" as const, letterSpacing: -0.1 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: "600" as const },
  callout: { fontSize: 14, lineHeight: 20, fontWeight: "500" as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "400" as const },
  eyebrow: { fontSize: 11, lineHeight: 14, fontWeight: "700" as const, letterSpacing: 1.0, textTransform: "uppercase" as const },
  mono: { fontVariant: ["tabular-nums"] as ("tabular-nums")[] },
} as const;

export const motion = {
  pressDuration: 120,
  quickDuration: 180,
  standardDuration: 240,
  staggerStep: 40,
  spring: {
    damping: 24,
    stiffness: 280,
    mass: 0.9,
  },
  pressScale: 0.97,
} as const;
