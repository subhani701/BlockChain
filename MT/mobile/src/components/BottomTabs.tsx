/** Custom bottom tab bar — Verify · History · About. */
import { View, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { sf, sp } from "../metrics";

export type Tab = "scan" | "history" | "about";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "scan", label: "Verify", icon: "qr-code" },
  { key: "history", label: "History", icon: "time" },
  { key: "about", label: "About", icon: "information-circle" }
];

export function BottomTabs({
  tab,
  setTab,
  historyCount
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  historyCount: number;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: t.card,
        borderTopWidth: 1,
        borderTopColor: t.border,
        paddingTop: sp(10),
        paddingBottom: insets.bottom + sp(8)
      }}
    >
      {TABS.map((item) => {
        const active = tab === item.key;
        const name = (active ? item.icon : `${item.icon}-outline`) as never;
        const badge =
          item.key === "history" && historyCount > 0 ? ` (${historyCount})` : "";
        return (
          <Pressable
            key={item.key}
            onPress={() => setTab(item.key)}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              { flex: 1, alignItems: "center", gap: 3 },
              pressed && { opacity: 0.6 }
            ]}
          >
            <Ionicons
              name={name}
              size={sf(24)}
              color={active ? t.primary : t.mutedFg}
            />
            <Text
              style={{
                fontSize: sf(12),
                fontWeight: active ? "700" : "500",
                color: active ? t.primary : t.mutedFg
              }}
            >
              {item.label}
              {badge}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
