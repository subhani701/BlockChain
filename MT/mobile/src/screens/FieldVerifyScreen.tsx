/**
 * FieldVerifyScreen — React Native port of the VoltusWave "Field Verify" mock,
 * wired to REAL scanning (expo-camera) and REAL verification (src/lib/verify).
 */
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useTheme, useThemeMode, type Theme } from "../theme";
import { sf, sp, CONTENT_MAX } from "../metrics";
import { card, press, RADIUS } from "../ui";
import {
  parseBundle,
  verifyBundle,
  type VerifyResult,
} from "../lib/verify";
import { genId, type HistoryItem, type ReportItem } from "../store";

type Phase = "idle" | "verifying" | "result";

const STEP_LABELS = [
  "Reading QR code",
  "Hashing leaf + Merkle proof",
  "Fetching on-chain root",
  "Matching provenance",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const short = (h?: string) =>
  h && h.length > 12 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h ?? "—";

interface Props {
  addHistory: (item: HistoryItem) => void;
  addReport: (r: ReportItem) => void;
  markReported: (id: string) => void;
  devMode: boolean;
}

const REPORT_REASONS = [
  "Looks fake",
  "Failed verification",
  "Suspicious seller",
  "Damaged / relabelled",
  "Other",
];

export default function FieldVerifyScreen({
  addHistory,
  addReport,
  markReported,
  devMode,
}: Props) {
  const t = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>("idle");
  const [steps, setSteps] = useState<boolean[]>([false, false, false, false]);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualText, setManualText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportNote, setReportNote] = useState("");
  const [reported, setReported] = useState(false);
  const handledRef = useRef(false);
  const historyIdRef = useRef<string | null>(null);

  const runVerify = useCallback(
    async (raw: string) => {
      setError(null);
      let bundle;
      try {
        bundle = parseBundle(raw);
      } catch (e) {
        handledRef.current = false;
        setError((e as Error).message);
        return;
      }
      setPhase("verifying");
      setSteps([false, false, false, false]);

      // Steps 0–1 are local + instant; pace them for legibility.
      await sleep(350);
      setSteps([true, false, false, false]);
      await sleep(350);
      setSteps([true, true, false, false]);

      // Step 2 = the real on-chain root read (+ compare).
      const res = await verifyBundle(bundle);
      setSteps([true, true, true, false]);
      await sleep(300);
      setSteps([true, true, true, true]);
      await sleep(200);

      setResult(res);
      setPhase("result");
      setReported(false);

      // Record to on-device history.
      const item: HistoryItem = {
        id: genId(),
        ts: Date.now(),
        verdict: res.verdict,
        serial: res.product.serial,
        sku: res.product.sku,
        batchId: res.batchId,
        reason: res.reason,
        offline: res.verdict === "CANNOT_VERIFY",
      };
      historyIdRef.current = item.id;
      addHistory(item);

      if (res.verdict === "AUTHENTIC")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (res.verdict === "COUNTERFEIT")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    [addHistory]
  );

  const onBarcode = useCallback(
    ({ data }: { data: string }) => {
      if (handledRef.current) return;
      handledRef.current = true;
      runVerify(data);
    },
    [runVerify]
  );

  const reset = useCallback(() => {
    handledRef.current = false;
    setResult(null);
    setError(null);
    setManualOpen(false);
    setManualText("");
    setReportOpen(false);
    setReported(false);
    setPhase("idle");
  }, []);

  function submitReport() {
    if (!result) return;
    const r: ReportItem = {
      id: genId(),
      ts: Date.now(),
      serial: result.product.serial,
      batchId: result.batchId,
      reason: reportReason,
      note: reportNote.trim(),
      status: "queued",
    };
    addReport(r);
    if (historyIdRef.current) markReported(historyIdRef.current);
    setReported(true);
    setReportOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header t={t} topInset={insets.top} />

      <ScrollView
        contentContainerStyle={{
          padding: sp(18),
          gap: sp(16),
          paddingBottom: sp(48),
          width: "100%",
          maxWidth: CONTENT_MAX,
          alignSelf: "center",
        }}
        keyboardShouldPersistTaps="handled"
      >
        {phase === "idle" && (
          <IdleView
            t={t}
            permission={permission?.granted ?? false}
            requestPermission={requestPermission}
            onBarcode={onBarcode}
            manualOpen={manualOpen}
            setManualOpen={setManualOpen}
            manualText={manualText}
            setManualText={setManualText}
            onManualVerify={() => manualText.trim() && runVerify(manualText.trim())}
            error={error}
            devMode={devMode}
          />
        )}

        {phase === "verifying" && <VerifyingView t={t} steps={steps} />}

        {phase === "result" && result && (
          <ResultView
            t={t}
            result={result}
            onReset={reset}
            reported={reported}
            onRaiseAlert={() => {
              setReportReason(REPORT_REASONS[0]);
              setReportNote("");
              setReportOpen(true);
            }}
          />
        )}
      </ScrollView>

      <ReportModal
        t={t}
        visible={reportOpen}
        reasons={REPORT_REASONS}
        reason={reportReason}
        setReason={setReportReason}
        note={reportNote}
        setNote={setReportNote}
        onCancel={() => setReportOpen(false)}
        onSubmit={submitReport}
        result={result}
      />
    </View>
  );
}

/* ----------------------------- Header ----------------------------- */
function Header({ t, topInset }: { t: Theme; topInset: number }) {
  const { mode, toggle } = useThemeMode();
  return (
    <View
      style={{
        paddingTop: topInset + sp(10),
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: t.card,
        borderBottomWidth: 1,
        borderBottomColor: t.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: t.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="finger-print" size={20} color={t.primaryFg} />
          </View>
          <View>
            <Text style={{ fontSize: sf(20), fontWeight: "800", color: t.fg }}>
              VoltusWave
            </Text>
            <Text style={{ fontSize: sf(11), fontWeight: "600", color: t.mutedFg }}>
              Aftermarket Intelligence
            </Text>
          </View>
        </View>
        <Pressable
          onPress={toggle}
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: t.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={mode === "dark" ? "sunny" : "moon"}
            size={16}
            color={t.fg}
          />
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginTop: 12,
        }}
      >
        <Ionicons name="qr-code" size={sf(22)} color={t.primary} />
        <Text style={{ fontSize: sf(28), fontWeight: "800", color: t.fg }}>
          Field Verify
        </Text>
      </View>
      <Text style={{ fontSize: sf(15), color: t.mutedFg, marginTop: 2 }}>
        Authenticate parts in 3 seconds
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          alignSelf: "flex-start",
          marginTop: 8,
          backgroundColor: t.greenBg,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
        }}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: t.green,
          }}
        />
        <Text style={{ fontSize: sf(13), fontWeight: "600", color: t.greenFg }}>
          Voltus Private Ethereum
        </Text>
      </View>
    </View>
  );
}

/* ----------------------------- Idle ----------------------------- */
function IdleView(props: {
  t: Theme;
  permission: boolean;
  requestPermission: () => void;
  onBarcode: (e: { data: string }) => void;
  manualOpen: boolean;
  setManualOpen: (v: boolean) => void;
  manualText: string;
  setManualText: (v: string) => void;
  onManualVerify: () => void;
  devMode: boolean;
  error: string | null;
}) {
  const { t } = props;
  return (
    <>
      <View
        style={{
          aspectRatio: 1,
          borderRadius: 20,
          overflow: "hidden",
          backgroundColor: t.viewfinderBottom,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {props.permission ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={props.onBarcode}
          />
        ) : (
          <View style={{ alignItems: "center", gap: 12, padding: 24 }}>
            <Ionicons name="camera-outline" size={56} color="#5F5E5A" />
            <Text style={{ color: "#CBD5E1", textAlign: "center", fontSize: 13 }}>
              Camera access is needed to scan product QR codes.
            </Text>
            <Pressable
              onPress={props.requestPermission}
              accessibilityRole="button"
              style={({ pressed }) => [
                {
                  backgroundColor: t.primary,
                  paddingHorizontal: sp(20),
                  paddingVertical: sp(12),
                  borderRadius: RADIUS.md,
                },
                press(pressed),
              ]}
            >
              <Text
                style={{ color: t.primaryFg, fontWeight: "700", fontSize: sf(15) }}
              >
                Grant camera
              </Text>
            </Pressable>
          </View>
        )}

        {/* reticle */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 28,
            bottom: 28,
            left: 28,
            right: 28,
            borderWidth: 2,
            borderColor: "rgba(196,8,31,0.6)",
            borderRadius: 16,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 16,
            backgroundColor: "rgba(0,0,0,0.6)",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 999,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Ionicons name="qr-code" size={14} color="#fff" />
          <Text style={{ color: "#fff", fontSize: sf(14), fontWeight: "600" }}>
            Align QR code within frame
          </Text>
        </View>
      </View>

      {props.error && (
        <View
          style={{
            backgroundColor: t.amberBg,
            borderRadius: 12,
            padding: 12,
            flexDirection: "row",
            gap: 8,
          }}
        >
          <Ionicons name="alert-circle" size={18} color={t.amber} />
          <Text style={{ color: t.amberFg, flex: 1, fontSize: 13 }}>
            {props.error}
          </Text>
        </View>
      )}

      {/* Manual entry — DEVELOPER MODE only (test without a printed QR). */}
      {props.devMode &&
        (!props.manualOpen ? (
          <Pressable
            onPress={() => props.setManualOpen(true)}
            style={{ alignSelf: "center", padding: 8 }}
          >
            <Text style={{ color: t.mutedFg, fontSize: sf(13) }}>
              Enter QR data manually
            </Text>
          </Pressable>
        ) : (
        <View style={{ gap: 8 }}>
          <TextInput
            value={props.manualText}
            onChangeText={props.setManualText}
            placeholder='Paste bundle JSON: {"v":1,"batchId":"…","product":{…},"proof":[…]}'
            placeholderTextColor={t.mutedFg}
            multiline
            style={{
              minHeight: 90,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              padding: 12,
              color: t.fg,
              backgroundColor: t.card,
              fontSize: 12,
            }}
          />
          <Pressable
            onPress={props.onManualVerify}
            accessibilityRole="button"
            style={({ pressed }) => [
              {
                backgroundColor: t.primary,
                paddingVertical: sp(14),
                borderRadius: RADIUS.md,
                alignItems: "center",
              },
              press(pressed),
            ]}
          >
            <Text
              style={{ color: t.primaryFg, fontWeight: "700", fontSize: sf(16) }}
            >
              Verify
            </Text>
          </Pressable>
        </View>
        ))}
    </>
  );
}

/* ----------------------------- Verifying ----------------------------- */
function VerifyingView({ t, steps }: { t: Theme; steps: boolean[] }) {
  const spin = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={{ gap: 14 }}>
      <View
        style={{
          backgroundColor: t.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: t.border,
          padding: 20,
          alignItems: "center",
          gap: 10,
        }}
      >
        <Animated.View
          style={{
            width: sp(72),
            height: sp(72),
            borderRadius: sp(36),
            borderWidth: 4,
            borderColor: t.muted,
            borderTopColor: t.primary,
            transform: [{ rotate }],
          }}
        />
        <Text style={{ fontSize: sf(19), fontWeight: "800", color: t.fg }}>
          Verifying authenticity…
        </Text>
        <Text style={{ fontSize: sf(15), color: t.mutedFg }}>
          Checking blockchain provenance
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        {STEP_LABELS.map((label, i) => {
          const done = steps[i];
          const active = !done && (i === 0 || steps[i - 1]);
          return (
            <View
              key={label}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                backgroundColor: done
                  ? t.greenBg
                  : active
                    ? t.card
                    : t.card,
                borderColor: done
                  ? t.green
                  : active
                    ? t.primary
                    : t.border,
              }}
            >
              <View
                style={{
                  width: sp(34),
                  height: sp(34),
                  borderRadius: sp(17),
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: done
                    ? t.green
                    : active
                      ? t.primary
                      : t.muted,
                }}
              >
                {done ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : active ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: t.mutedFg, fontWeight: "700" }}>
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text
                style={{
                  fontSize: sf(16),
                  color: done ? t.fg : t.mutedFg,
                  fontWeight: done ? "600" : "400",
                }}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ----------------------------- Result ----------------------------- */
function ResultView({
  t,
  result,
  onReset,
  reported,
  onRaiseAlert,
}: {
  t: Theme;
  result: VerifyResult;
  onReset: () => void;
  reported: boolean;
  onRaiseAlert: () => void;
}) {
  const v = result.verdict;
  const palette =
    v === "AUTHENTIC"
      ? { bg: t.greenBg, fg: t.greenFg, accent: t.green, icon: "shield-checkmark" as const, title: "Authentic" }
      : v === "COUNTERFEIT"
        ? { bg: t.redBg, fg: t.redFg, accent: t.red, icon: "close-circle" as const, title: "Could not verify" }
        : { bg: t.amberBg, fg: t.amberFg, accent: t.amber, icon: "help-circle" as const, title: "Cannot verify" };

  const p = result.product;

  return (
    <View style={{ gap: 12 }}>
      {/* Verdict banner */}
      <View
        style={{
          backgroundColor: palette.bg,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: palette.accent,
          padding: sp(24),
          alignItems: "center",
          gap: sp(8),
        }}
      >
        <Ionicons name={palette.icon} size={sf(64)} color={palette.accent} />
        <Text style={{ fontSize: sf(30), fontWeight: "800", color: palette.fg }}>
          {palette.title}
        </Text>
        <Text style={{ fontSize: sf(16), color: palette.fg, textAlign: "center" }}>
          {v === "COUNTERFEIT" && !result.onChain
            ? result.reason
            : v === "COUNTERFEIT"
              ? "Part may be counterfeit or grey-market"
              : result.reason}
        </Text>
      </View>

      {/* Flagged (recalled/revoked) strip */}
      {result.flagged &&
        result.warnings.map((w) => (
          <View
            key={w}
            style={{
              backgroundColor: t.amberBg,
              borderRadius: 12,
              padding: 12,
              flexDirection: "row",
              gap: 8,
            }}
          >
            <Ionicons name="warning" size={18} color={t.amber} />
            <Text style={{ color: t.amberFg, flex: 1, fontWeight: "600" }}>
              {w}
            </Text>
          </View>
        ))}

      {/* Part identity */}
      <Card t={t}>
        <CardHeader t={t} accent={palette.accent} title="Part identity" />
        <View style={{ padding: 14, gap: 12 }}>
          <Row2 t={t}>
            <Field t={t} label="SKU" value={p.sku} mono />
            <Field t={t} label="Batch" value={p.batch_id} mono />
          </Row2>
          <Row2 t={t}>
            <Field t={t} label="Mfg date" value={p.manufactured_at} />
            <Field
              t={t}
              label="Batch status"
              value={result.onChain?.statusLabel ?? "—"}
            />
          </Row2>
          <Field t={t} label="Serial" value={p.serial} mono />
        </View>
      </Card>

      {/* On-chain proof */}
      <Card t={t}>
        <View style={{ padding: 14, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="shield" size={13} color={t.primary} />
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 0.5,
                color: t.fg,
                textTransform: "uppercase",
              }}
            >
              {result.onChain ? "Verified on-chain" : "Chain read"}
            </Text>
          </View>
          <KV t={t} k="Computed leaf" v={short(result.computed.leaf)} mono />
          <KV t={t} k="Computed root" v={short(result.computed.root)} mono />
          <KV
            t={t}
            k="On-chain root"
            v={result.onChain ? short(result.onChain.merkleRoot) : "unavailable"}
            mono
          />
          {result.onChain && (
            <KV
              t={t}
              k="Match"
              v={
                result.computed.root.toLowerCase() ===
                result.onChain.merkleRoot.toLowerCase()
                  ? "yes ✓"
                  : "no ✗"
              }
            />
          )}
        </View>
      </Card>

      {/* Suspect: reasons + report */}
      {v === "COUNTERFEIT" && (
        <>
          <View
            style={{
              backgroundColor: t.amberBg,
              borderRadius: 12,
              padding: 12,
              gap: 6,
            }}
          >
            <Text style={{ color: t.amberFg, fontSize: 12 }}>
              • {result.reason}
            </Text>
            <Text style={{ color: t.amberFg, fontSize: 12 }}>
              • No matching provenance for batch {result.batchId}
            </Text>
          </View>
          {reported ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingVertical: 12,
              }}
            >
              <Ionicons name="checkmark-circle" size={18} color={t.green} />
              <Text style={{ color: t.fg, fontWeight: "600" }}>
                Channel-integrity alert raised
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={onRaiseAlert}
              accessibilityRole="button"
              style={({ pressed }) => [
                {
                  backgroundColor: t.red,
                  paddingVertical: sp(16),
                  borderRadius: RADIUS.md,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                },
                press(pressed),
              ]}
            >
              <Ionicons name="alert-circle" size={sf(20)} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: sf(16) }}>
                Raise channel-integrity alert
              </Text>
            </Pressable>
          )}
        </>
      )}

      {/* Actions */}
      <Pressable
        onPress={onReset}
        accessibilityRole="button"
        style={({ pressed }) => [
          {
            backgroundColor: t.muted,
            paddingVertical: sp(16),
            borderRadius: RADIUS.md,
            alignItems: "center",
          },
          press(pressed),
        ]}
      >
        <Text style={{ color: t.fg, fontWeight: "700", fontSize: sf(16) }}>
          Scan another part
        </Text>
      </Pressable>
    </View>
  );
}

/* ----------------------------- Report modal ----------------------------- */
function ReportModal({
  t,
  visible,
  reasons,
  reason,
  setReason,
  note,
  setNote,
  onCancel,
  onSubmit,
  result,
}: {
  t: Theme;
  visible: boolean;
  reasons: string[];
  reason: string;
  setReason: (r: string) => void;
  note: string;
  setNote: (n: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  result: VerifyResult | null;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.4)",
        }}
      >
        <View
          style={{
            backgroundColor: t.bg,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: insets.bottom + sp(16),
            gap: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "800", color: t.fg }}>
              Report suspicious part
            </Text>
            <Pressable onPress={onCancel} hitSlop={8}>
              <Ionicons name="close" size={22} color={t.mutedFg} />
            </Pressable>
          </View>
          {result && (
            <Text style={{ fontSize: 13, color: t.mutedFg }}>
              {result.product.sku} · {result.product.serial}
            </Text>
          )}

          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: t.mutedFg,
              textTransform: "uppercase",
            }}
          >
            Reason
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {reasons.map((r) => {
              const active = r === reason;
              return (
                <Pressable
                  key={r}
                  onPress={() => setReason(r)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [
                    {
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: RADIUS.pill,
                      backgroundColor: active ? t.primary : t.card,
                      borderWidth: 1,
                      borderColor: active ? t.primary : t.border,
                    },
                    press(pressed),
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: active ? t.primaryFg : t.fg,
                    }}
                  >
                    {r}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: t.mutedFg,
              textTransform: "uppercase",
            }}
          >
            Note (optional)
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Where / how you found it…"
            placeholderTextColor={t.mutedFg}
            multiline
            style={{
              minHeight: 70,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              padding: 12,
              color: t.fg,
              backgroundColor: t.card,
              fontSize: 14,
            }}
          />

          <View style={{ flexDirection: "row", gap: sp(10) }}>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              style={({ pressed }) => [
                {
                  flex: 1,
                  paddingVertical: sp(15),
                  borderRadius: RADIUS.md,
                  alignItems: "center",
                  backgroundColor: t.muted,
                },
                press(pressed),
              ]}
            >
              <Text style={{ color: t.fg, fontWeight: "700", fontSize: sf(16) }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={onSubmit}
              accessibilityRole="button"
              style={({ pressed }) => [
                {
                  flex: 1,
                  paddingVertical: sp(15),
                  borderRadius: RADIUS.md,
                  alignItems: "center",
                  backgroundColor: t.red,
                },
                press(pressed),
              ]}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: sf(16) }}>
                Submit report
              </Text>
            </Pressable>
          </View>
          <Text
            style={{ fontSize: 11, color: t.mutedFg, textAlign: "center" }}
          >
            Queued on-device · uploads when online
          </Text>
        </View>
      </View>
    </Modal>
  );
}

/* ----------------------------- small pieces ----------------------------- */
function Card({ t, children }: { t: Theme; children: React.ReactNode }) {
  return <View style={{ ...card(t), overflow: "hidden" }}>{children}</View>;
}
function CardHeader({
  t,
  accent,
  title,
}: {
  t: Theme;
  accent: string;
  title: string;
}) {
  return (
    <View style={{ backgroundColor: accent, paddingHorizontal: 14, paddingVertical: 10 }}>
      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
        {title}
      </Text>
    </View>
  );
}
function Row2({ t, children }: { t: Theme; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      {React.Children.map(children, (c) => (
        <View style={{ flex: 1 }}>{c}</View>
      ))}
    </View>
  );
}
function Field({
  t,
  label,
  value,
  mono,
}: {
  t: Theme;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View>
      <Text
        style={{
          fontSize: sf(11),
          fontWeight: "700",
          letterSpacing: 0.5,
          color: t.mutedFg,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: sf(15),
          fontWeight: "600",
          color: t.fg,
          marginTop: 2,
          fontFamily: mono
            ? Platform.select({ ios: "Menlo", android: "monospace" })
            : undefined,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
function KV({
  t,
  k,
  v,
  mono,
}: {
  t: Theme;
  k: string;
  v: string;
  mono?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ fontSize: sf(13), color: t.mutedFg }}>{k}</Text>
      <Text
        style={{
          fontSize: sf(13),
          color: t.fg,
          fontFamily: mono
            ? Platform.select({ ios: "Menlo", android: "monospace" })
            : undefined,
        }}
      >
        {v}
      </Text>
    </View>
  );
}
