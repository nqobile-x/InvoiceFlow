import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { radius, type InvoiceStatusKey } from "../theme/tokens";
import { NativeIcon, type AppIconName } from "./NativeIcon";

const STATUS_META: Record<InvoiceStatusKey, { label: string; icon: AppIconName }> = {
  DRAFT: { label: "Draft", icon: "draft" },
  SENT: { label: "Sent", icon: "send" },
  VIEWED: { label: "Viewed", icon: "viewed" },
  PAID: { label: "Paid", icon: "check-circle" },
  OVERDUE: { label: "Overdue", icon: "alert" },
  CANCELLED: { label: "Cancelled", icon: "cancelled" },
};

export function StatusBadge({ status }: { status: string }) {
  const { colors } = useTheme();
  const key = (status in STATUS_META ? status : "DRAFT") as InvoiceStatusKey;
  const meta = STATUS_META[key];
  const tone = colors.status[key];

  return (
    <View
      style={[styles.badge, { backgroundColor: tone.bg }]}
      accessibilityLabel={`Status: ${meta.label}`}
    >
      <NativeIcon name={meta.icon} size={12} color={tone.fg} decorative />
      <Text style={[styles.text, { color: tone.fg }]} maxFontSizeMultiplier={1.4}>
        {meta.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
