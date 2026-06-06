import { Platform } from "react-native";

export const colors = {
  gold: "#5c3d1e",
  goldDark: "#2c1810",
  goldLight: "#8b6914",
  goldAccent: "#d4a84b",
  cream: "#faf8f5",
  creamDark: "#f5f0e8",
  border: "#e8dcc8",
  card: "#ffffff",
  text: "#2c1810",
  textMuted: "#8b6914",
  textOnGold: "#ffffff",
  textOnGoldMuted: "#e8dcc8",
  success: "#166534",
  successBg: "#dcfce7",
  warning: "#b45309",
  warningBg: "#fef3c7",
  danger: "#991b1b",
  dangerBg: "#fee2e2",
  info: "#0369a1",
  infoBg: "#e0f2fe",
  attended: "#166534",
  attendedBg: "#bbf7d0",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const typography = {
  title: { fontSize: 22, fontWeight: "700" as const },
  heading: { fontSize: 18, fontWeight: "700" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  bodyBold: { fontSize: 15, fontWeight: "600" as const },
  caption: { fontSize: 12, fontWeight: "400" as const },
  captionBold: { fontSize: 12, fontWeight: "600" as const },
  micro: { fontSize: 11, fontWeight: "400" as const },
  stat: { fontSize: 22, fontWeight: "700" as const },
} as const;

export const layout = {
  maxFormWidth: 420,
  maxContentWidth: 560,
  minTouchTarget: 44,
  compactWidth: 360,
  tabBarHeight: Platform.select({ ios: 84, android: 64, default: 64 }),
  headerPaddingTop: Platform.select({ ios: 8, android: 16, default: 16 }),
} as const;

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: "#5c3d1e",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 2 },
    default: {},
  }),
} as const;
