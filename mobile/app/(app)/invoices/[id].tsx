import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, router } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { invoiceApi } from "@/services/apiMethods";
import { formatCurrency, formatDate } from "@/utils/currency";
import { StatusBadge } from "@/components/StatusBadge";

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: inv, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => invoiceApi.get(id).then((r) => r.data),
    enabled: !!id,
  });

  const sendMutation = useMutation({
    mutationFn: () => invoiceApi.send(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      Alert.alert("Sent", "Invoice emailed to client.");
    },
    onError: () => Alert.alert("Error", "Could not send invoice."),
  });

  const paidMutation = useMutation({
    mutationFn: () =>
      invoiceApi.markPaid(id, {
        amount: Number(inv?.total ?? 0),
        paymentMethod: "EFT",
        reference: inv?.invoiceNumber ?? "",
        paidAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      Alert.alert("Marked Paid", "Invoice status updated.");
    },
    onError: () => Alert.alert("Error", "Could not mark as paid."),
  });

  async function downloadPdf() {
    if (!inv) return;
    setActionLoading("pdf");
    try {
      const { data } = await invoiceApi.downloadPdf(id);
      const uint8 = new Uint8Array(data as ArrayBuffer);
      const base64 = btoa(uint8.reduce((d, b) => d + String.fromCharCode(b), ""));
      const uri = FileSystem.cacheDirectory + `${inv.invoiceNumber}.pdf`;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(uri, { mimeType: "application/pdf" });
    } catch {
      Alert.alert("Error", "Could not download PDF.");
    } finally {
      setActionLoading(null);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color="#C9A84C" style={{ marginTop: 64 }} />
      </SafeAreaView>
    );
  }

  if (!inv) return null;

  const canSend = inv.status === "DRAFT";
  const canMarkPaid = inv.status === "SENT" || inv.status === "VIEWED" || inv.status === "OVERDUE";

  return (
    <SafeAreaView style={s.safe}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <StatusBadge status={inv.status} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Invoice header */}
        <View style={s.invoiceHeader}>
          <Text style={s.invNum}>{inv.invoiceNumber}</Text>
          <Text style={s.clientName}>{inv.client.companyName ?? inv.client.name}</Text>
          <View style={s.dates}>
            <View>
              <Text style={s.dateLabel}>Issue Date</Text>
              <Text style={s.dateVal}>{formatDate(inv.issueDate)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.dateLabel}>Due Date</Text>
              <Text style={[s.dateVal, inv.status === "OVERDUE" && { color: "#DC2626" }]}>
                {formatDate(inv.dueDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Line items */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Line Items</Text>
          {inv.lineItems.map((item, i) => (
            <View key={i} style={s.lineItem}>
              <View style={{ flex: 1 }}>
                <Text style={s.lineDesc}>{item.description}</Text>
                <Text style={s.lineSub}>Qty {item.quantity} × {formatCurrency(item.unitPrice, inv.currency)}</Text>
              </View>
              <Text style={s.lineAmount}>{formatCurrency(item.amount, inv.currency)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totalsBox}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalVal}>{formatCurrency(inv.subtotal, inv.currency)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>VAT</Text>
            <Text style={s.totalVal}>{formatCurrency(inv.taxTotal, inv.currency)}</Text>
          </View>
          <View style={[s.totalRow, s.totalDue]}>
            <Text style={s.totalDueLabel}>TOTAL DUE</Text>
            <Text style={s.totalDueVal}>{formatCurrency(inv.total, inv.currency)}</Text>
          </View>
        </View>

        {/* Notes */}
        {inv.notes && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Notes</Text>
            <Text style={s.noteText}>{inv.notes}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={s.actions}>
          {canSend && (
            <TouchableOpacity
              style={[s.actionBtn, s.actionPrimary]}
              onPress={() => {
                Alert.alert("Send Invoice", "Email this invoice to the client?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Send", onPress: () => sendMutation.mutate() },
                ]);
              }}
              disabled={sendMutation.isPending}
              activeOpacity={0.85}
            >
              {sendMutation.isPending
                ? <ActivityIndicator color="#0A1628" />
                : <Text style={s.actionPrimaryText}>Send Invoice</Text>
              }
            </TouchableOpacity>
          )}

          {canMarkPaid && (
            <TouchableOpacity
              style={[s.actionBtn, s.actionSuccess]}
              onPress={() => {
                Alert.alert("Mark as Paid", "Confirm payment received?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Confirm", onPress: () => paidMutation.mutate() },
                ]);
              }}
              disabled={paidMutation.isPending}
              activeOpacity={0.85}
            >
              {paidMutation.isPending
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={s.actionSuccessText}>Mark as Paid</Text>
              }
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[s.actionBtn, s.actionOutline]}
            onPress={downloadPdf}
            disabled={actionLoading === "pdf"}
            activeOpacity={0.85}
          >
            {actionLoading === "pdf"
              ? <ActivityIndicator color="#0A1628" />
              : <Text style={s.actionOutlineText}>Download PDF</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F6F1" },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
            backgroundColor: "#0A1628", paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { paddingVertical: 4 },
  backText: { fontSize: 14, color: "#C9A84C", fontWeight: "600" },
  invoiceHeader: { backgroundColor: "#0A1628", paddingHorizontal: 20, paddingBottom: 24, paddingTop: 4 },
  invNum: { fontSize: 28, fontWeight: "700", color: "#FFFFFF", fontVariant: ["tabular-nums"], marginBottom: 4 },
  clientName: { fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 16 },
  dates: { flexDirection: "row", justifyContent: "space-between" },
  dateLabel: { fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase",
               letterSpacing: 0.8, marginBottom: 2 },
  dateVal: { fontSize: 14, color: "#FFFFFF", fontWeight: "600" },
  section: { backgroundColor: "#FFFFFF", marginHorizontal: 16, marginTop: 16, padding: 16 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase",
                  letterSpacing: 0.8, marginBottom: 12 },
  lineItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
              paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#E2DDD6" },
  lineDesc: { fontSize: 14, color: "#0A1628", fontWeight: "600", marginBottom: 2 },
  lineSub: { fontSize: 12, color: "#6B7280" },
  lineAmount: { fontSize: 14, fontWeight: "700", color: "#0A1628", fontVariant: ["tabular-nums"] },
  totalsBox: { backgroundColor: "#FFFFFF", marginHorizontal: 16, marginTop: 2, padding: 16 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6,
              borderBottomWidth: 1, borderBottomColor: "#E2DDD6" },
  totalLabel: { fontSize: 13, color: "#4A5568" },
  totalVal: { fontSize: 13, color: "#0A1628", fontVariant: ["tabular-nums"] },
  totalDue: { backgroundColor: "#0A1628", marginHorizontal: -16, marginBottom: -16,
              paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0 },
  totalDueLabel: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  totalDueVal: { fontSize: 16, fontWeight: "700", color: "#C9A84C", fontVariant: ["tabular-nums"] },
  noteText: { fontSize: 14, color: "#4A5568", lineHeight: 20 },
  actions: { padding: 16, gap: 10 },
  actionBtn: { paddingVertical: 14, alignItems: "center" },
  actionPrimary: { backgroundColor: "#C9A84C" },
  actionPrimaryText: { fontSize: 15, fontWeight: "700", color: "#0A1628" },
  actionSuccess: { backgroundColor: "#059669" },
  actionSuccessText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  actionOutline: { borderWidth: 1.5, borderColor: "#0A1628" },
  actionOutlineText: { fontSize: 15, fontWeight: "600", color: "#0A1628" },
});
