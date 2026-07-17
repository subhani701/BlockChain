/** Shared verdict → label/color/icon mapping (used by Scan result + History). */
import type { Theme } from "./theme";
import type { Verdict } from "./lib/verify";

export function verdictStyle(v: Verdict, t: Theme) {
  if (v === "AUTHENTIC")
    return {
      label: "Genuine",
      color: t.green,
      bg: t.greenBg,
      fg: t.greenFg,
      icon: "shield-checkmark" as const
    };
  if (v === "COUNTERFEIT")
    return {
      label: "Suspect",
      color: t.red,
      bg: t.redBg,
      fg: t.redFg,
      icon: "close-circle" as const
    };
  return {
    label: "Cannot verify",
    color: t.amber,
    bg: t.amberBg,
    fg: t.amberFg,
    icon: "help-circle" as const
  };
}
