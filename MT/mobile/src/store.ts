/**
 * store.ts — on-device persistence for scan history + counterfeit reports.
 * Simple AsyncStorage-backed helpers; the app shell (App.tsx) holds the state
 * and passes it down, so Scan writes and History reads the same data.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Verdict } from "./lib/verify";

export interface HistoryItem {
  id: string;
  ts: number; // epoch ms
  verdict: Verdict;
  serial: string;
  sku: string;
  batchId: string;
  reason: string;
  offline?: boolean;
  reported?: boolean;
}

export interface ReportItem {
  id: string;
  ts: number;
  serial: string;
  batchId: string;
  reason: string;
  note: string;
  status: "queued";
}

const HISTORY_KEY = "tm.history.v1";
const REPORTS_KEY = "tm.reports.v1";

export const genId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export async function loadHistory(): Promise<HistoryItem[]> {
  try {
    const s = await AsyncStorage.getItem(HISTORY_KEY);
    return s ? (JSON.parse(s) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

export async function saveHistory(h: HistoryItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  } catch {
    /* best effort */
  }
}

export async function loadReports(): Promise<ReportItem[]> {
  try {
    const s = await AsyncStorage.getItem(REPORTS_KEY);
    return s ? (JSON.parse(s) as ReportItem[]) : [];
  } catch {
    return [];
  }
}

export async function saveReports(r: ReportItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(r));
  } catch {
    /* best effort */
  }
}

/** "3m ago", "2h ago", "Apr 28" — compact relative time for the history feed. */
export function relTime(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}
