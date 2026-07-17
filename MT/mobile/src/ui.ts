/**
 * ui.ts — the mobile design system. One source of truth for spacing, radii,
 * typography, shadows, and interaction states so every screen is consistent.
 * All sizes run through the responsive scale (metrics.ts).
 */
import { Platform, type ViewStyle, type TextStyle } from "react-native";
import { sf, sp } from "./metrics";
import type { Theme } from "./theme";

/** 8px spacing system — SPACE.md == 12, SPACE.lg == 16, etc. (pre-scaled). */
export const SPACE = {
  xs: sp(4),
  sm: sp(8),
  md: sp(12),
  lg: sp(16),
  xl: sp(20),
  xxl: sp(24),
  xxxl: sp(32),
};

/** Consistent corner radii. */
export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
};

/** Typography scale — apply as a style object: `style={TYPE.title}` + a color. */
export const TYPE: Record<string, TextStyle> = {
  display: { fontSize: sf(30), fontWeight: "800", letterSpacing: -0.5 },
  title: { fontSize: sf(24), fontWeight: "800", letterSpacing: -0.3 },
  heading: { fontSize: sf(17), fontWeight: "700" },
  subhead: { fontSize: sf(15), fontWeight: "600" },
  body: { fontSize: sf(15), fontWeight: "400", lineHeight: sf(21) },
  bodySm: { fontSize: sf(13), fontWeight: "400", lineHeight: sf(18) },
  label: {
    fontSize: sf(11),
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  caption: { fontSize: sf(12), fontWeight: "500" },
  button: { fontSize: sf(16), fontWeight: "700" },
};

export const MONO = Platform.select({ ios: "Menlo", android: "monospace" });

/** Subtle, consistent card elevation (softer in light, deeper in dark). */
export function cardShadow(t: Theme): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: t.isDark ? 0.35 : 0.07,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: {},
  }) as ViewStyle;
}

/** A standard card surface. Spread into a View style. */
export function card(t: Theme): ViewStyle {
  return {
    backgroundColor: t.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: t.border,
    ...cardShadow(t),
  };
}

/** Press feedback for Pressable `style={({pressed}) => [base, press(pressed)]}`. */
export const press = (pressed: boolean): ViewStyle =>
  pressed ? { opacity: 0.85, transform: [{ scale: 0.99 }] } : {};

/** Comfortable, touch-friendly minimum control height (≥44pt guideline). */
export const CONTROL_H = sp(52);
export const HIT = { top: 8, bottom: 8, left: 8, right: 8 };
