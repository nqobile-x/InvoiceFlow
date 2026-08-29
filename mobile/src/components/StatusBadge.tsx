import React from "react";
import { View, Text, StyleSheet } from "react-native";

const STATUS: Record<string, { bg: string; text: string }> = {
  DRAFT:     { bg: "#6B728018", text: "#6B7280" },
  SENT:      { bg: "#2563EB18", text: "#2563EB" },
  VIEWED:    { bg: "#7C3AED18", text: "#7C3AED" },
  PAID:      { bg: "#05966918", text: "#059669" },
  OVERDUE:   { bg: "#DC262618", text: "#DC2626" },
  CANCELLED: { bg: "#9CA3AF18", text: "#9CA3AF" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.DRAFT;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  text: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});
