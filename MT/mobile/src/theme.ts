/**
 * theme.ts — VoltusWave AMI palette (from the real mock's globals.css).
 * Primary accent is RED (#C4081F). Green = verified, amber = offline/warn.
 *
 * Theme mode is app-controlled (defaults to LIGHT, like the mock) via a context,
 * with a header toggle — it does NOT follow the device's system theme.
 */
import { createContext, useContext } from "react";

export interface Theme {
  primary: string;
  primaryFg: string;
  bg: string;
  fg: string;
  card: string;
  muted: string;
  mutedFg: string;
  border: string;
  green: string;
  greenBg: string;
  greenFg: string;
  red: string;
  redBg: string;
  redFg: string;
  amber: string;
  amberBg: string;
  amberFg: string;
  viewfinderTop: string;
  viewfinderBottom: string;
  isDark: boolean;
}

const light: Theme = {
  primary: "#C4081F",
  primaryFg: "#FFFFFF",
  bg: "#F4F6F9",
  fg: "#1E293B",
  card: "#FFFFFF",
  muted: "#F1F5F9",
  mutedFg: "#64748B",
  border: "#E2E8F0",
  green: "#16A34A",
  greenBg: "#DCFCE7",
  greenFg: "#14532D",
  red: "#DC2626",
  redBg: "#FEE2E2",
  redFg: "#7F1D1D",
  amber: "#D97706",
  amberBg: "#FEF3C7",
  amberFg: "#78350F",
  viewfinderTop: "#2C2C2C",
  viewfinderBottom: "#1A1A1A",
  isDark: false,
};

const dark: Theme = {
  primary: "#D40924",
  primaryFg: "#FFFFFF",
  bg: "#0E1116",
  fg: "#E8EDF4",
  card: "#171B22",
  muted: "#20252E",
  mutedFg: "#9AA6B5",
  border: "#2A303B",
  green: "#22C55E",
  greenBg: "#14311F",
  greenFg: "#BBF7D0",
  red: "#F87171",
  redBg: "#3A1414",
  redFg: "#FECACA",
  amber: "#FBBF24",
  amberBg: "#3A2A0C",
  amberFg: "#FDE68A",
  viewfinderTop: "#2C2C2C",
  viewfinderBottom: "#1A1A1A",
  isDark: true,
};

export type ThemeMode = "light" | "dark";

export const ThemeModeContext = createContext<{
  mode: ThemeMode;
  toggle: () => void;
}>({ mode: "light", toggle: () => {} });

export function useThemeMode() {
  return useContext(ThemeModeContext);
}

export function useTheme(): Theme {
  const { mode } = useThemeMode();
  return mode === "dark" ? dark : light;
}

export const themes = { light, dark };
