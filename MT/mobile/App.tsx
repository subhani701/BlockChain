import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import FieldVerifyScreen from "./src/screens/FieldVerifyScreen";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { AboutScreen } from "./src/screens/AboutScreen";
import { BottomTabs, type Tab } from "./src/components/BottomTabs";
import { ThemeModeContext, themes, type ThemeMode } from "./src/theme";
import {
  loadHistory,
  saveHistory,
  loadReports,
  saveReports,
  type HistoryItem,
  type ReportItem
} from "./src/store";

export default function App() {
  const [mode, setMode] = useState<ThemeMode>("light"); // default LIGHT, like the mock
  const t = mode === "dark" ? themes.dark : themes.light;
  const toggleTheme = useCallback(
    () => setMode((m) => (m === "light" ? "dark" : "light")),
    []
  );
  const [tab, setTab] = useState<Tab>("scan");
  const [devMode, setDevMode] = useState(false); // hides internal config/tools by default
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load persisted state on first mount.
  useEffect(() => {
    Promise.all([loadHistory(), loadReports()]).then(([h, r]) => {
      setHistory(h);
      setReports(r);
      setLoaded(true);
    });
  }, []);

  // Persist whenever it changes (after the initial load).
  useEffect(() => {
    if (loaded) saveHistory(history);
  }, [history, loaded]);
  useEffect(() => {
    if (loaded) saveReports(reports);
  }, [reports, loaded]);

  const addHistory = useCallback(
    (item: HistoryItem) => setHistory((h) => [item, ...h].slice(0, 200)),
    []
  );
  const addReport = useCallback(
    (r: ReportItem) => setReports((rs) => [r, ...rs]),
    []
  );
  const markReported = useCallback(
    (id: string) =>
      setHistory((h) =>
        h.map((x) => (x.id === id ? { ...x, reported: true } : x))
      ),
    []
  );
  const clearHistory = useCallback(() => setHistory([]), []);

  return (
    <SafeAreaProvider>
      <ThemeModeContext.Provider value={{ mode, toggle: toggleTheme }}>
        <View style={{ flex: 1, backgroundColor: t.bg }}>
          <StatusBar style={mode === "dark" ? "light" : "dark"} />
          <View style={{ flex: 1 }}>
            {tab === "scan" && (
              <FieldVerifyScreen
                addHistory={addHistory}
                addReport={addReport}
                markReported={markReported}
                devMode={devMode}
              />
            )}
            {tab === "history" && (
              <HistoryScreen history={history} onClear={clearHistory} />
            )}
            {tab === "about" && (
              <AboutScreen devMode={devMode} setDevMode={setDevMode} />
            )}
          </View>
          <BottomTabs tab={tab} setTab={setTab} historyCount={history.length} />
        </View>
      </ThemeModeContext.Provider>
    </SafeAreaProvider>
  );
}
