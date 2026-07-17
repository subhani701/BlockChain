/** Shared UI primitives — consistent Button, Card, SectionLabel, Chip, Skeleton. */
import { useEffect, useRef } from "react";
import {
  Pressable,
  View,
  Text,
  ActivityIndicator,
  Animated,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import { sf } from "../metrics";
import { card, press, RADIUS, SPACE, TYPE, CONTROL_H, HIT } from "../ui";

type Variant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled,
  loading,
  full = true,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
}) {
  const t = useTheme();
  const bg =
    variant === "primary"
      ? t.primary
      : variant === "danger"
        ? t.red
        : variant === "secondary"
          ? t.muted
          : "transparent";
  const fg =
    variant === "primary" || variant === "danger" ? "#fff" : t.fg;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={({ pressed }) => [
        {
          minHeight: CONTROL_H,
          borderRadius: RADIUS.md,
          backgroundColor: bg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: SPACE.sm,
          paddingHorizontal: SPACE.lg,
          opacity: disabled ? 0.5 : 1,
          alignSelf: full ? "stretch" : "flex-start",
          borderWidth: variant === "ghost" ? 1 : 0,
          borderColor: t.border,
        },
        press(pressed),
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : icon ? (
        <Ionicons name={icon} size={sf(18)} color={fg} />
      ) : null}
      <Text style={[TYPE.button, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({
  children,
  style,
  padded,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={[card(t), padded ? { padding: SPACE.lg } : null, style]}>
      {children}
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  const t = useTheme();
  return <Text style={[TYPE.label, { color: t.mutedFg }]}>{children}</Text>;
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          paddingHorizontal: SPACE.md,
          paddingVertical: SPACE.sm,
          borderRadius: RADIUS.pill,
          backgroundColor: active ? t.primary : t.card,
          borderWidth: 1,
          borderColor: active ? t.primary : t.border,
        },
        press(pressed),
      ]}
    >
      <Text
        style={[
          TYPE.caption,
          {
            fontWeight: "600",
            color: active ? t.primaryFg : t.mutedFg,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Shimmering skeleton block for loading states. */
export function Skeleton({
  width,
  height,
  radius = RADIUS.sm,
}: {
  width: number | `${number}%`;
  height: number;
  radius?: number;
}) {
  const t = useTheme();
  const a = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: t.muted,
        opacity: a,
      }}
    />
  );
}
