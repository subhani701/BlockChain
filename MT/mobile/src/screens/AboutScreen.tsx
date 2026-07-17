/** About — trust model, live chain connection, and app config (read-only). */
import { useEffect, useState } from "react";
import { View, Text, ScrollView, Platform, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, useThemeMode, type Theme } from "../theme";
import { sf } from "../metrics";
import { card } from "../ui";
import { BACKEND_URL, BACKEND_SOURCE } from "../lib/config";

const short = (h?: string) =>
  h && h.length > 14 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h ?? "—";

const STEPS = [
  "Read the product QR (its fields + Merkle proof)",
  "Recompute the leaf hash on-device (keccak256)",
  "Climb the proof to rebuild the batch root",
  "Read the batch's real root from the blockchain",
  "Match? Genuine. Mismatch or missing? Not verified."
];

export function AboutScreen({
  devMode,
  setDevMode
}: {
  devMode: boolean;
  setDevMode: (v: boolean) => void;
}) {
  const t = useTheme();
  const { mode, toggle } = useThemeMode();
  const [chain, setChain] = useState<
    { connected: boolean; contractAddress?: string; rpcUrl?: string } | null
  >(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let alive = true;
    fetch(`${BACKEND_URL}/verify/chain/status`)
      .then((r) => r.json())
      .then((c) => alive && setChain(c))
      .catch(() => alive && setChain({ connected: false }));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View
        style={{
          paddingTop: insets.top + sf(10),
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: t.card,
          borderBottomWidth: 1,
          borderBottomColor: t.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 12
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: t.primary,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Ionicons name="finger-print" size={20} color={t.primaryFg} />
        </View>
        <View>
          <Text style={{ fontSize: sf(20), fontWeight: "800", color: t.fg }}>
            VoltusWave Field Verify
          </Text>
          <Text style={{ fontSize: sf(12), color: t.mutedFg }}>
            Aftermarket Intelligence · v1.0
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
        {/* Live connection */}
        <Card t={t} title="Connection">
          <Row t={t} k="Network" v="Voltus Private Ethereum" />
          <Row
            t={t}
            k="Status"
            v={chain ? (chain.connected ? "Connected" : "Offline") : "Checking…"}
            valueColor={chain?.connected ? t.green : t.amber}
          />
        </Card>

        {/* Appearance — global theme setting */}
        <Card t={t} title="Appearance">
          <ToggleRow
            t={t}
            label="Dark mode"
            value={mode === "dark"}
            onValueChange={toggle}
          />
        </Card>

        {/* How it works */}
        <Card t={t} title="How verification works">
          {STEPS.map((s, i) => (
            <View
              key={i}
              style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 4 }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: t.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 1
                }}
              >
                <Text style={{ color: t.primaryFg, fontSize: 11, fontWeight: "700" }}>
                  {i + 1}
                </Text>
              </View>
              <Text style={{ flex: 1, fontSize: sf(15), color: t.fg }}>{s}</Text>
            </View>
          ))}
        </Card>

        {/* Trust model */}
        <Card t={t} title="Why you can trust it">
          <Text style={{ fontSize: sf(14), color: t.mutedFg, lineHeight: sf(21) }}>
            The QR carries only evidence — it can’t claim its own authenticity.
            The app recomputes everything itself and checks it against the root
            written on the blockchain, which no one (not even the manufacturer)
            can alter after the fact. A cloned or edited QR won’t match.
          </Text>
        </Card>

        {/* Developer mode — hides internal config + tools from normal users */}
        <Card t={t} title="Developer">
          <ToggleRow
            t={t}
            label="Developer mode"
            value={devMode}
            onValueChange={setDevMode}
          />
          {devMode && (
            <View style={{ marginTop: 8, gap: 2 }}>
              <Row t={t} k="Contract" v={short(chain?.contractAddress)} mono />
              <Row t={t} k="Backend" v={BACKEND_URL} mono />
              <Row t={t} k="Backend source" v={BACKEND_SOURCE} />
            </View>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

function ToggleRow({
  t,
  label,
  value,
  onValueChange
}: {
  t: Theme;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 4
      }}
    >
      <Text style={{ fontSize: sf(15), color: t.fg, fontWeight: "500" }}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: t.border, true: t.primary }}
        thumbColor="#fff"
        ios_backgroundColor={t.border}
      />
    </View>
  );
}

function Card({
  t,
  title,
  children
}: {
  t: Theme;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ ...card(t), padding: 16, gap: 4 }}>
      <Text
        style={{
          fontSize: sf(11),
          fontWeight: "700",
          letterSpacing: 0.6,
          color: t.mutedFg,
          textTransform: "uppercase",
          marginBottom: 8
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({
  t,
  k,
  v,
  mono,
  valueColor
}: {
  t: Theme;
  k: string;
  v: string;
  mono?: boolean;
  valueColor?: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 3,
        gap: 12
      }}
    >
      <Text style={{ fontSize: sf(14), color: t.mutedFg }}>{k}</Text>
      <Text
        style={{
          fontSize: sf(14),
          color: valueColor ?? t.fg,
          fontWeight: "600",
          flexShrink: 1,
          textAlign: "right",
          fontFamily: mono
            ? Platform.select({ ios: "Menlo", android: "monospace" })
            : undefined
        }}
        numberOfLines={1}
      >
        {v}
      </Text>
    </View>
  );
}
