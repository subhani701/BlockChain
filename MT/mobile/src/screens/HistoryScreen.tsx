/** History — a persisted provenance feed of past verifications. */
import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { sf } from "../metrics";
import { card, press, RADIUS } from "../ui";
import { verdictStyle } from "../verdict-ui";
import { relTime, type HistoryItem } from "../store";
import type { Verdict } from "../lib/verify";

type Filter = "all" | "AUTHENTIC" | "COUNTERFEIT" | "CANNOT_VERIFY";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "AUTHENTIC", label: "Genuine" },
  { key: "COUNTERFEIT", label: "Suspect" },
  { key: "CANNOT_VERIFY", label: "Cannot verify" }
];

export function HistoryScreen({
  history,
  onClear
}: {
  history: HistoryItem[];
  onClear: () => void;
}) {
  const t = useTheme();
  const [filter, setFilter] = useState<Filter>("all");
  const insets = useSafeAreaInsets();

  const rows = useMemo(
    () => (filter === "all" ? history : history.filter((h) => h.verdict === filter)),
    [history, filter]
  );

  const counts = useMemo(() => {
    const c = { AUTHENTIC: 0, COUNTERFEIT: 0, CANNOT_VERIFY: 0 } as Record<
      Verdict,
      number
    >;
    for (const h of history) c[h.verdict]++;
    return c;
  }, [history]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + sf(10),
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: t.card,
          borderBottomWidth: 1,
          borderBottomColor: t.border,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between"
        }}
      >
        <View>
          <Text style={{ fontSize: sf(24), fontWeight: "800", color: t.fg }}>
            History
          </Text>
          <Text style={{ fontSize: sf(14), color: t.mutedFg, marginTop: 2 }}>
            {history.length} verification{history.length === 1 ? "" : "s"} ·{" "}
            {counts.AUTHENTIC} genuine · {counts.COUNTERFEIT} suspect
          </Text>
        </View>
        {history.length > 0 && (
          <Pressable onPress={onClear} hitSlop={8}>
            <Text style={{ color: t.mutedFg, fontSize: 13 }}>Clear</Text>
          </Pressable>
        )}
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        style={{ flexGrow: 0 }}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              accessibilityRole="button"
              style={({ pressed }) => [
                {
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: RADIUS.pill,
                  backgroundColor: active ? t.primary : t.card,
                  borderWidth: 1,
                  borderColor: active ? t.primary : t.border
                },
                press(pressed)
              ]}
            >
              <Text
                style={{
                  fontSize: sf(14),
                  fontWeight: "600",
                  color: active ? t.primaryFg : t.mutedFg
                }}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* List */}
      {rows.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Ionicons name="time-outline" size={48} color={t.mutedFg} />
          <Text style={{ color: t.mutedFg, marginTop: 12, textAlign: "center" }}>
            {history.length === 0
              ? "No verifications yet.\nScan a product QR to get started."
              : "Nothing matches this filter."}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, gap: 8 }}>
          {rows.map((h) => {
            const vs = verdictStyle(h.verdict, t);
            return (
              <View
                key={h.id}
                style={{
                  ...card(t),
                  borderRadius: RADIUS.md,
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12
                }}
              >
                <Ionicons name={vs.icon} size={sf(28)} color={vs.color} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View
                      style={{
                        backgroundColor: vs.bg,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 999
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: vs.fg }}>
                        {vs.label}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: sf(15),
                        fontWeight: "700",
                        color: t.fg,
                        fontFamily: Platform.select({ ios: "Menlo", android: "monospace" })
                      }}
                      numberOfLines={1}
                    >
                      {h.sku}
                    </Text>
                  </View>
                  <Text style={{ fontSize: sf(13), color: t.mutedFg, marginTop: 3 }} numberOfLines={1}>
                    {h.serial} · {h.batchId}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 3 }}>
                  <Text style={{ fontSize: 11, color: t.mutedFg }}>{relTime(h.ts)}</Text>
                  {h.reported && (
                    <View
                      style={{
                        backgroundColor: t.amberBg,
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                        borderRadius: 999
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: "700", color: t.amberFg }}>
                        Reported
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
