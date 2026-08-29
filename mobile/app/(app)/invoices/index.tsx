import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { invoiceApi, type InvoiceSummary } from "@/services/apiMethods";
import { formatCurrency, formatDate } from "@/utils/currency";
import { StatusBadge } from "@/components/StatusBadge";

const TABS = ["ALL", "DRAFT", "SENT", "VIEWED", "PAID", "OVERDUE"] as const;
type Tab = typeof TABS[number];

export default function InvoicesScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("ALL");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["invoices", activeTab],
    queryFn: () =>
      invoiceApi.list({ status: activeTab === "ALL" ? undefined : activeTab, size: 50 })
        .then((r) => r.data),
  });

  const invoices = data?.content ?? [];

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Invoices</Text>
        <TouchableOpacity style={s.newBtn} onPress={() => router.push("/(app)/invoices/new")} activeOpacity={0.85}>
          <Text style={s.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Status filter tabs */}
      <View style={s.tabsWrapper}>
        <FlatList
          horizontal
          data={TABS}
          keyExtractor={(t) => t}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.tab, activeTab === item && s.tabActive]}
              onPress={() => setActiveTab(item)}
              activeOpacity={0.7}
            >
              <Text style={[s.tabText, activeTab === item && s.tabTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color="#C9A84C" style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(i) => i.id}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#C9A84C" />}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>No {activeTab !== "ALL" ? activeTab.toLowerCase() : ""} invoices.</Text>
            </View>
          }
          renderItem={({ item }: { item: InvoiceSummary }) => (
            <TouchableOpacity
              style={s.row}
              onPress={() => router.push(`/(app)/invoices/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={s.rowTop}>
                <Text style={s.invNum}>{item.invoiceNumber}</Text>
                <Text style={s.amount}>{formatCurrency(item.total, item.currency)}</Text>
              </View>
              <View style={s.rowBottom}>
                <Text style={s.clientName}>{item.clientName}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={s.date}>Due {formatDate(item.dueDate)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F6F1" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
            backgroundColor: "#0A1628", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  title: { fontSize: 22, fontWeight: "700", color: "#FFFFFF" },
  newBtn: { backgroundColor: "#C9A84C", paddingHorizontal: 16, paddingVertical: 8 },
  newBtnText: { fontSize: 13, fontWeight: "700", color: "#0A1628" },
  tabsWrapper: { backgroundColor: "#FFFFFF", paddingVertical: 12,
                 borderBottomWidth: 1, borderBottomColor: "#E2DDD6" },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: "#E2DDD6" },
  tabActive: { borderColor: "#0A1628", backgroundColor: "#0A1628" },
  tabText: { fontSize: 11, fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.6 },
  tabTextActive: { color: "#FFFFFF" },
  row: { backgroundColor: "#FFFFFF", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E2DDD6" },
  rowTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  rowBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  invNum: { fontSize: 14, fontWeight: "700", color: "#0A1628", fontVariant: ["tabular-nums"] },
  amount: { fontSize: 15, fontWeight: "700", color: "#0A1628", fontVariant: ["tabular-nums"] },
  clientName: { fontSize: 13, color: "#4A5568" },
  date: { fontSize: 11, color: "#9CA3AF" },
  empty: { paddingTop: 64, alignItems: "center" },
  emptyText: { fontSize: 14, color: "#9CA3AF" },
});
