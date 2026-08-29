import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { clientApi, invoiceApi, type LineItem } from "@/services/apiMethods";
import { formatCurrency } from "@/utils/currency";

const today = () => new Date().toISOString().split("T")[0];
const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};

function newItem(): LineItem {
  return { description: "", quantity: 1, unitPrice: 0, taxRate: 15, amount: 0 };
}

function calcItem(item: LineItem): LineItem {
  const amount = Number(item.quantity) * Number(item.unitPrice) * (1 + Number(item.taxRate) / 100);
  return { ...item, amount: Math.round(amount * 100) / 100 };
}

export default function NewInvoiceScreen() {
  const qc = useQueryClient();
  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState(inDays(30));
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("Payment due within 30 days of invoice date.");
  const [items, setItems] = useState<LineItem[]>([newItem()]);
  const [showClients, setShowClients] = useState(false);

  const { data: clientsData } = useQuery({
    queryKey: ["clients-all"],
    queryFn: () => clientApi.list({ size: 100 }).then((r) => r.data),
  });
  const clients = clientsData?.content ?? [];
  const selectedClient = clients.find((c) => c.id === clientId);

  function updateItem(idx: number, field: keyof LineItem, value: string | number) {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = calcItem({ ...next[idx], [field]: field === "description" ? value : Number(value) });
      return next;
    });
  }

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const taxTotal = items.reduce((s, i) => s + i.unitPrice * i.quantity * (i.taxRate / 100), 0);
  const total = subtotal + taxTotal;

  const { mutate: create, isPending } = useMutation({
    mutationFn: () =>
      invoiceApi.create({ clientId, issueDate, dueDate, lineItems: items, notes, terms }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      router.replace(`/(app)/invoices/${res.data.id}`);
    },
    onError: () => Alert.alert("Error", "Could not create invoice."),
  });

  function submit() {
    if (!clientId) { Alert.alert("Required", "Please select a client."); return; }
    if (items.some((i) => !i.description)) { Alert.alert("Required", "All items need a description."); return; }
    create();
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>New Invoice</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">

          {/* Client selection */}
          <View style={s.section}>
            <Text style={s.label}>Client *</Text>
            <TouchableOpacity style={s.selectBtn} onPress={() => setShowClients(!showClients)} activeOpacity={0.7}>
              <Text style={selectedClient ? s.selectVal : s.selectPlaceholder}>
                {selectedClient ? (selectedClient.companyName ?? selectedClient.name) : "Select client…"}
              </Text>
              <Text style={{ color: "#6B7280" }}>{showClients ? "▲" : "▼"}</Text>
            </TouchableOpacity>
            {showClients && (
              <View style={s.dropdown}>
                {clients.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={s.dropdownItem}
                    onPress={() => { setClientId(c.id); setShowClients(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={s.dropdownText}>{c.companyName ?? c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Dates */}
          <View style={s.section}>
            <View style={s.row}>
              <View style={s.half}>
                <Text style={s.label}>Issue Date</Text>
                <TextInput style={s.input} value={issueDate} onChangeText={setIssueDate} placeholder="YYYY-MM-DD" />
              </View>
              <View style={s.half}>
                <Text style={s.label}>Due Date</Text>
                <TextInput style={s.input} value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" />
              </View>
            </View>
          </View>

          {/* Line items */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Line Items</Text>
            {items.map((item, idx) => (
              <View key={idx} style={s.lineItem}>
                <TextInput
                  style={[s.input, { marginBottom: 8 }]}
                  value={item.description}
                  onChangeText={(v) => updateItem(idx, "description", v)}
                  placeholder="Description"
                  placeholderTextColor="#9CA3AF"
                />
                <View style={s.row}>
                  <View style={s.third}>
                    <Text style={s.miniLabel}>Qty</Text>
                    <TextInput style={s.input} value={String(item.quantity)}
                      onChangeText={(v) => updateItem(idx, "quantity", v)}
                      keyboardType="numeric" />
                  </View>
                  <View style={s.third}>
                    <Text style={s.miniLabel}>Unit Price</Text>
                    <TextInput style={s.input} value={String(item.unitPrice)}
                      onChangeText={(v) => updateItem(idx, "unitPrice", v)}
                      keyboardType="numeric" />
                  </View>
                  <View style={s.third}>
                    <Text style={s.miniLabel}>VAT %</Text>
                    <TextInput style={s.input} value={String(item.taxRate)}
                      onChangeText={(v) => updateItem(idx, "taxRate", v)}
                      keyboardType="numeric" />
                  </View>
                </View>
                <View style={s.lineFooter}>
                  <Text style={s.lineTotal}>Amount: {formatCurrency(item.amount)}</Text>
                  {items.length > 1 && (
                    <TouchableOpacity onPress={() => setItems((p) => p.filter((_, i) => i !== idx))}>
                      <Text style={s.removeText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
            <TouchableOpacity style={s.addBtn} onPress={() => setItems((p) => [...p, newItem()])} activeOpacity={0.7}>
              <Text style={s.addBtnText}>+ Add Line Item</Text>
            </TouchableOpacity>
          </View>

          {/* Totals summary */}
          <View style={s.totals}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Subtotal</Text>
              <Text style={s.totalVal}>{formatCurrency(subtotal)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>VAT</Text>
              <Text style={s.totalVal}>{formatCurrency(taxTotal)}</Text>
            </View>
            <View style={[s.totalRow, s.totalDue]}>
              <Text style={s.totalDueLabel}>TOTAL DUE</Text>
              <Text style={s.totalDueVal}>{formatCurrency(total)}</Text>
            </View>
          </View>

          {/* Notes */}
          <View style={s.section}>
            <Text style={s.label}>Notes</Text>
            <TextInput style={[s.input, { height: 80, textAlignVertical: "top" }]}
              value={notes} onChangeText={setNotes} multiline placeholder="Optional notes to client" placeholderTextColor="#9CA3AF" />
            <Text style={[s.label, { marginTop: 12 }]}>Terms &amp; Conditions</Text>
            <TextInput style={[s.input, { height: 80, textAlignVertical: "top" }]}
              value={terms} onChangeText={setTerms} multiline placeholderTextColor="#9CA3AF" />
          </View>

          {/* Submit */}
          <TouchableOpacity style={[s.submitBtn, isPending && { opacity: 0.7 }]}
            onPress={submit} disabled={isPending} activeOpacity={0.85}>
            {isPending ? <ActivityIndicator color="#0A1628" /> : <Text style={s.submitText}>Create Invoice</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F6F1" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
            backgroundColor: "#0A1628", paddingHorizontal: 20, paddingVertical: 16 },
  back: { fontSize: 14, color: "#C9A84C", fontWeight: "600", width: 60 },
  title: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  section: { backgroundColor: "#FFFFFF", marginHorizontal: 16, marginTop: 16, padding: 16 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase",
                  letterSpacing: 0.8, marginBottom: 12 },
  label: { fontSize: 11, fontWeight: "600", color: "#4A5568", textTransform: "uppercase",
           letterSpacing: 0.8, marginBottom: 6 },
  miniLabel: { fontSize: 10, color: "#9CA3AF", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#E2DDD6", backgroundColor: "#FFFFFF",
           paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#0A1628" },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  third: { flex: 1 },
  selectBtn: { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
               borderWidth: 1, borderColor: "#E2DDD6", backgroundColor: "#FFFFFF",
               paddingHorizontal: 12, paddingVertical: 12 },
  selectVal: { fontSize: 14, color: "#0A1628" },
  selectPlaceholder: { fontSize: 14, color: "#9CA3AF" },
  dropdown: { borderWidth: 1, borderColor: "#E2DDD6", borderTopWidth: 0, backgroundColor: "#FFFFFF" },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 12,
                  borderBottomWidth: 1, borderBottomColor: "#E2DDD6" },
  dropdownText: { fontSize: 14, color: "#0A1628" },
  lineItem: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#E2DDD6" },
  lineFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  lineTotal: { fontSize: 13, fontWeight: "700", color: "#0A1628" },
  removeText: { fontSize: 12, color: "#DC2626" },
  addBtn: { borderWidth: 1, borderColor: "#C9A84C", padding: 12, alignItems: "center", marginTop: 4 },
  addBtnText: { fontSize: 13, fontWeight: "600", color: "#C9A84C" },
  totals: { backgroundColor: "#FFFFFF", marginHorizontal: 16, marginTop: 2, padding: 16 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6,
              borderBottomWidth: 1, borderBottomColor: "#E2DDD6" },
  totalLabel: { fontSize: 13, color: "#4A5568" },
  totalVal: { fontSize: 13, color: "#0A1628", fontVariant: ["tabular-nums"] },
  totalDue: { backgroundColor: "#0A1628", marginHorizontal: -16, marginBottom: -16,
              paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0 },
  totalDueLabel: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  totalDueVal: { fontSize: 16, fontWeight: "700", color: "#C9A84C", fontVariant: ["tabular-nums"] },
  submitBtn: { backgroundColor: "#C9A84C", margin: 16, paddingVertical: 16, alignItems: "center" },
  submitText: { fontSize: 16, fontWeight: "700", color: "#0A1628" },
});
