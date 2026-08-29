import React from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { dashboardApi, type InvoiceSummary } from "@/services/apiMethods";
import { useAuthStore } from "@/store/auth";
import { formatCurrency, formatDate } from "@/utils/currency";
import { StatusBadge } from "@/components/StatusBadge";

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={[s.card, { borderTopColor: accent, borderTopWidth: 3 }]}>
      <Text style={s.cardLabel}>{label}</Text>
      <Text style={s.cardValue}>{value}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);

  const { data: summary, isLoading: loadingSum, refetch } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboardApi.summary().then((r) => r.data),
  });

  const { data: recent = [], isLoading: loadingRecent } = useQuery({
    queryKey: ["dashboard", "recent"],
    queryFn: () => dashboardApi.recentInvoices().then((r) => r.data),
  });

  const cur = summary?.currency ?? "ZAR";
  const n = (v: unknown) => Number(v) || 0;
  const isLoading = loadingSum || loadingRecent;

  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        style={s.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#C9A84C" />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{greeting()}</Text>
            <Text style={s.userName}>{user?.firstName} {user?.lastName}</Text>
          </View>
          <TouchableOpacity style={s.newBtn} onPress={() => router.push("/(app)/invoices/new")} activeOpacity={0.85}>
            <Text style={s.newBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>

        {/* Stat cards */}
        {isLoading ? (
          <ActivityIndicator color="#C9A84C" style={{ marginVertical: 32 }} />
        ) : (
          <View style={s.grid}>
            <StatCard label="Total Invoiced" value={formatCurrency(n(summary?.totalInvoiced), cur)} accent="#C9A84C" />
            <StatCard label="Collected" value={formatCurrency(n(summary?.totalPaid), cur)} accent="#059669" />
            <StatCard label="Outstanding" value={formatCurrency(n(summary?.totalOutstanding), cur)} accent="#2563EB" />
            <StatCard label="Overdue" value={formatCurrency(n(summary?.totalOverdue), cur)} accent="#DC2626" />
          </View>
        )}

        {/* Recent invoices */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Recent Invoices</Text>
            <TouchableOpacity onPress={() => router.push("/(app)/invoices/index")}>
              <Text style={s.viewAll}>View all →</Text>
            </TouchableOpacity>
          </View>

          {recent.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>No invoices yet.</Text>
              <TouchableOpacity onPress={() => router.push("/(app)/invoices/new")}>
                <Text style={s.emptyLink}>Create your first invoice →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recent.map((inv: InvoiceSummary) => (
              <TouchableOpacity
                key={inv.id}
                style={s.row}
                onPress={() => router.push(`/(app)/invoices/${inv.id}`)}
                activeOpacity={0.7}
              >
                <View style={s.rowLeft}>
                  <Text style={s.invoiceNum}>{inv.invoiceNumber}</Text>
                  <Text style={s.clientName}>{inv.clientName}</Text>
                </View>
                <View style={s.rowRight}>
                  <Text style={s.amount}>{formatCurrency(inv.total, inv.currency)}</Text>
                  <StatusBadge status={inv.status} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F6F1" },
  scroll: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
            backgroundColor: "#0A1628", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  greeting: { fontSize: 12, color: "rgba(255,255,255,0.5)", textTransform: "uppercase",
              letterSpacing: 1, marginBottom: 4 },
  userName: { fontSize: 24, fontWeight: "700", color: "#FFFFFF" },
  newBtn: { backgroundColor: "#C9A84C", paddingHorizontal: 16, paddingVertical: 8 },
  newBtnText: { fontSize: 13, fontWeight: "700", color: "#0A1628" },
  grid: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 12 },
  card: { flex: 1, minWidth: "45%", backgroundColor: "#FFFFFF", padding: 16,
          shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardLabel: { fontSize: 10, fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase",
               letterSpacing: 0.8, marginBottom: 8 },
  cardValue: { fontSize: 18, fontWeight: "700", color: "#0A1628", fontVariant: ["tabular-nums"] },
  section: { marginHorizontal: 16, marginBottom: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                   paddingVertical: 12 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: "#4A5568", textTransform: "uppercase",
                  letterSpacing: 0.8 },
  viewAll: { fontSize: 12, fontWeight: "600", color: "#C9A84C" },
  empty: { backgroundColor: "#FFFFFF", padding: 32, alignItems: "center" },
  emptyText: { fontSize: 14, color: "#9CA3AF", marginBottom: 8 },
  emptyLink: { fontSize: 13, fontWeight: "600", color: "#C9A84C" },
  row: { backgroundColor: "#FFFFFF", flexDirection: "row", justifyContent: "space-between",
         alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E2DDD6" },
  rowLeft: { flex: 1 },
  rowRight: { alignItems: "flex-end", gap: 6 },
  invoiceNum: { fontSize: 13, fontWeight: "700", color: "#0A1628", fontVariant: ["tabular-nums"],
                marginBottom: 2 },
  clientName: { fontSize: 12, color: "#4A5568" },
  amount: { fontSize: 14, fontWeight: "700", color: "#0A1628", fontVariant: ["tabular-nums"] },
});
