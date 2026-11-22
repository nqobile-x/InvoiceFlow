import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, touchTarget, typography } from "../theme/tokens";
import { NativeIcon, type AppIconName } from "./NativeIcon";
import { NativePressable } from "./NativePressable";

interface StateViewProps {
  icon: AppIconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "neutral" | "danger";
}

export function StateView({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  tone = "neutral",
}: StateViewProps) {
  const { colors } = useTheme();
  const iconColor = tone === "danger" ? colors.danger : colors.accentText;
  const iconBg = tone === "danger" ? colors.dangerBg : colors.accentSoft;

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <NativeIcon name={icon} size={28} color={iconColor} decorative />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
      {actionLabel && onAction ? (
        <NativePressable
          haptic="light"
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={[styles.btn, { backgroundColor: colors.accent }]}
        >
          <Text style={[styles.btnText, { color: colors.onAccent }]}>{actionLabel}</Text>
        </NativePressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: 48,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headline,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.callout,
    textAlign: "center",
    maxWidth: 300,
    lineHeight: 21,
  },
  btn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    minHeight: touchTarget.minHeight,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    ...typography.bodyStrong,
  },
});
