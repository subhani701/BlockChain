/**
 * metrics.ts — responsive sizing so the UI scales across phone/tablet sizes
 * instead of using fixed web-scale numbers.
 *
 *   sf(n) — scaled font size    sp(n) — scaled spacing / dimension
 * Scale is relative to a ~380pt base phone, clamped to [1, 1.4] so small phones
 * aren't cramped and large screens/tablets don't blow up.
 */
import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");
const shortest = Math.min(width, height);
const k = Math.min(Math.max(shortest / 380, 1), 1.4);

export const sf = (n: number) => Math.round(n * k);
export const sp = (n: number) => Math.round(n * k);

/** Full window width and a comfortable max content width for large screens. */
export const winWidth = width;
export const winHeight = height;
export const CONTENT_MAX = 620;
