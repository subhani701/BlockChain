/**
 * config.ts — where the app finds the MT backend.
 *
 * The app verifies LOCALLY (recomputes the leaf + root itself) but reads the
 * AUTHORITATIVE on-chain root from the MT backend's `GET /batch/:id/onchain`.
 *
 * When you run via Expo Go on a phone, `localhost` is the PHONE, not your laptop.
 * So we auto-derive your laptop's LAN IP from the Metro bundler host — the same
 * IP Expo already uses — and talk to the backend on that IP, port 4000. This
 * "just works" when phone + laptop are on the same Wi-Fi.
 *
 * Override anytime with an env var:  EXPO_PUBLIC_BACKEND_URL=http://10.0.0.5:4000
 */
import Constants from "expo-constants";

const BACKEND_PORT = 4000;

function inferHostFromMetro(): string | null {
  // e.g. "192.168.1.7:8081" (SDK hostUri) or legacy manifest.debuggerHost.
  const c = Constants as unknown as {
    expoConfig?: { hostUri?: string };
    manifest?: { debuggerHost?: string };
    manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
  };
  const hostUri =
    c.expoConfig?.hostUri ??
    c.manifest?.debuggerHost ??
    c.manifest2?.extra?.expoGo?.debuggerHost;
  if (!hostUri || typeof hostUri !== "string") return null;
  const host = hostUri.split(":")[0]?.trim();
  return host && host.length > 0 ? host : null;
}

const inferred = inferHostFromMetro();

export const BACKEND_URL: string =
  (process.env.EXPO_PUBLIC_BACKEND_URL as string | undefined) ||
  (inferred ? `http://${inferred}:${BACKEND_PORT}` : "http://localhost:4000");

/** Shown in Settings/About so you can confirm what the app is talking to. */
export const BACKEND_SOURCE: string = process.env.EXPO_PUBLIC_BACKEND_URL
  ? "env override"
  : inferred
    ? "auto (LAN)"
    : "localhost fallback";
