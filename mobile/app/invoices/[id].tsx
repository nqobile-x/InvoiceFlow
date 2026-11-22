import { useCallback, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { invoiceApi } from "../../src/services/apiMethods";
import { useTheme } from "../../src/theme/ThemeProvider";
import { radius, spacing, touchTarget, typography } from "../../src/theme/tokens";
import { formatCurrency, formatDate } from "../../src/utils/currency";
import { haptics } from "../../src/utils/haptics";
import { NativeIcon } from "../../src/components/NativeIcon";
import { NativePressable } from "../../src/components/NativePressable";
import { StatusBadge } from "../../src/components/StatusBadge";
import { InvoiceDetailSkeleton } from "../../src/components/Skeleton";
import { StateView } from "../../src/components/StateView";

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const query = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => invoiceApi.get(id).then((r) => r.data),
    enabled: !!id,
  });

  const inv = query.data;

  const invalidateAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["invoice", id] });
    qc.invalidateQueries({ queryKey: ["invoices"] });
    qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    qc.invalidateQueries({ queryKey: ["dashboard-recent"] });
  }, [qc, id]);

  const sendMutation = useMutation({
    mutationFn: () => invoiceApi.send(id),
    onSuccess: () => {
      haptics.success();
      invalidateAll();
      Alert.alert("Invoice Sent", "The invoice has been emailed to your client.");
    },
    onError: () => {
      haptics.error();
      Alert.alert("Error", "Could not send invoice. Please try again.");
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: () =>
      invoiceApi.markPaid(id, {
        amount: inv!.total,
        paymentMethod: "BANK_TRANSFER",
        reference: `Manual-${inv!.invoiceNumber}`,
        paidAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      haptics.success();
      invalidateAll();
      Alert.alert("Marked Paid", "Full payment has been recorded.");
    },
    onError: () => {
      haptics.error();
      Alert.alert("Error", "Failed to update payment status.");
    },
  });

  const downloadPdf = useCallback(async () => {
    if (!inv || downloading) return;
    haptics.light();
    setDownloading(true);
    try {
      const { data } = await invoiceApi.downloadPdf(id);
      const safeName = inv.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
      const pdfFile = new File(Paths.cache, `Invoice-${safeName}.pdf`);
      pdfFile.create({ overwrite: true });
      pdfFile.write(new Uint8Array(data as ArrayBuffer));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfFile.uri, {
          mimeType: "application/pdf",
          dialogTitle: `Share ${inv.invoiceNumber}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("PDF Ready", `Saved ${pdfFile.name} to device cache.`);
      }
    } catch {
      haptics.error();
      Alert.alert("Error", "Could not download invoice PDF.");
    } finally {
      setDownloading(false);
    }
  }, [inv, id, downloading]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: inv?.invoiceNumber ?? "Invoice",
      headerRight: inv
        ? () => (
            <NativePressable
              haptic="light"
              onPress={downloadPdf}
              disabled={downloading}
              hitSlop={touchTarget.hitSlop}
              accessibilityRole="button"
              accessibilityLabel="Share invoice PDF"
              style={s.headerIconBtn}
            >
              {downloading ? (
                <ActivityIndicator size="small" color={colors.accentText} />
              ) : (
                <NativeIcon name="share" size={20} color={colors.accentText} decorative />
              )}
            </NativePressable>
          )
        : undefined,
    });
  }, [navigation, inv, downloadPdf, downloading, colors]);

  const onRefresh = useCallback(async () => {
    haptics.light();
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  if (query.isLoading && !inv) {
    return (
      <ScrollView style={[s.root, { backgroundColor: colors.bg }]}>
        <InvoiceDetailSkeleton />
      </ScrollView>
    );
  }

  if (query.isError || !inv) {
    return (
      <View style={[s.root, s.center, { backgroundColor: colors.bg }]}>
        <StateView
          icon="alert"
          tone="danger"
          title="Could not load invoice"
          description="Check your internet connection and try again."
          actionLabel="Retry"
          onAction={onRefresh}
        />
      </View>
    );
  }

  const isOverdue = inv.status === "OVERDUE";

  return (
    <ScrollView
      style={[s.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
          progressBackgroundColor={colors.surface}
        />
      }
    >
      {/* Hero Summary Card */}
      <View
        style={[
          s.heroCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={s.heroTop}>
          <Text style={[s.heroNum, { color: colors.textSecondary }]}>{inv.invoiceNumber}</Text>
          <StatusBadge status={inv.status} />
        </View>
        <Text
          style={[s.heroTotal, { color: colors.text }]}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {formatCurrency(inv.total, inv.currency)}
        </Text>
        <Text style={[s.heroClient, { color: colors.textSecondary }]} numberOfLines={1}>
          {inv.client.companyName ?? inv.client.name}
        </Text>
        <View style={[s.dateStrip, { borderTopColor: colors.borderSubtle }]}>
          <View style={s.dateCol}>
            <Text style={[s.dateLabel, { color: colors.textMuted }]}>ISSUED</Text>
            <Text style={[s.dateValue, { color: colors.text }]}>{formatDate(inv.issueDate)}</Text>
          </View>
          <View style={s.dateColRight}>
            <Text style={[s.dateLabel, { color: colors.textMuted }]}>DUE DATE</Text>
            <Text
              style={[
                s.dateValue,
                { color: isOverdue ? colors.danger : colors.text },
              ]}
            >
              {formatDate(inv.dueDate)}
            </Text>
          </View>
        </View>
      </View>

      {/* Client & Reference Metadata */}
      <Text style={[s.sectionLabel, { color: colors.textMuted }]}>CLIENT & DETAILS</Text>
      <View
        style={[
          s.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <DetailRow label="Client" value={inv.client.companyName ?? inv.client.name} />
        {inv.client.companyName ? <DetailRow label="Contact" value={inv.client.name} /> : null}
        {inv.client.email ? <DetailRow label="Email" value={inv.client.email} /> : null}
        {inv.purchaseOrderNumber ? (
          <DetailRow label="PO Number" value={inv.purchaseOrderNumber} />
        ) : null}
        {inv.contactPerson ? <DetailRow label="Attention" value={inv.contactPerson} /> : null}
        {inv.tinNumber ? <DetailRow label="TIN" value={inv.tinNumber} /> : null}
        <DetailRow label="Currency" value={inv.currency} last />
      </View>

      {/* Line Items */}
      <Text style={[s.sectionLabel, { color: colors.textMuted }]}>
        LINE ITEMS ({inv.lineItems.length})
      </Text>
      <View
        style={[
          s.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {inv.lineItems.map((li, i) => (
          <View
            key={`${li.description}-${i}`}
            style={[
              s.lineItem,
              i < inv.lineItems.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.borderSubtle,
              },
            ]}
          >
            <View style={s.lineTop}>
              <Text style={[s.lineDesc, { color: colors.text }]}>{li.description}</Text>
              <Text style={[s.lineAmt, { color: colors.text }]}>
                {formatCurrency(li.amount, inv.currency)}
              </Text>
            </View>
            <Text style={[s.lineSub, { color: colors.textMuted }]}>
              {li.quantity} × {formatCurrency(li.unitPrice, inv.currency)}
              {li.taxRate > 0 ? ` · ${li.taxRate}% VAT` : ""}
            </Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View
        style={[
          s.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={s.totalRow}>
          <Text style={[s.totalLabel, { color: colors.textSecondary }]}>Subtotal</Text>
          <Text style={[s.totalVal, { color: colors.text }]}>
            {formatCurrency(inv.subtotal, inv.currency)}
          </Text>
        </View>
        {inv.taxTotal > 0 ? (
          <View style={s.totalRow}>
            <Text style={[s.totalLabel, { color: colors.textSecondary }]}>VAT</Text>
            <Text style={[s.totalVal, { color: colors.text }]}>
              {formatCurrency(inv.taxTotal, inv.currency)}
            </Text>
          </View>
        ) : null}
        <View style={[s.totalDueRow, { borderTopColor: colors.border }]}>
          <Text style={[s.totalDueLabel, { color: colors.accentText }]}>TOTAL DUE</Text>
          <Text style={[s.totalDueVal, { color: colors.accentText }]}>
            {formatCurrency(inv.total, inv.currency)}
          </Text>
        </View>
      </View>

      {/* Notes */}
      {inv.notes ? (
        <>
          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>NOTES</Text>
          <View
            style={[
              s.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[s.noteText, { color: colors.textSecondary }]}>{inv.notes}</Text>
          </View>
        </>
      ) : null}

      {/* Primary Action Buttons */}
      <View style={s.actions}>
        {(inv.status === "SENT" || inv.status === "VIEWED" || inv.status === "OVERDUE") ? (
          <NativePressable
            haptic="medium"
            onPress={() =>
              Alert.alert(
                "Mark as Paid",
                `Record full payment (${formatCurrency(inv.total, inv.currency)}) for ${inv.invoiceNumber}?`,
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Mark Paid", onPress: () => markPaidMutation.mutate() },
                ]
              )
            }
            disabled={markPaidMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Mark invoice as paid"
            style={[s.actionBtn, { backgroundColor: "#059669" }]}
          >
            {markPaidMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <NativeIcon name="check-circle" size={18} color="#FFFFFF" decorative />
                <Text style={s.actionBtnLightText}>Mark as Paid</Text>
              </>
            )}
          </NativePressable>
        ) : null}

        {(inv.status === "DRAFT" || inv.status === "OVERDUE") ? (
          <NativePressable
            haptic="medium"
            onPress={() =>
              Alert.alert(
                "Send Invoice",
                `Email ${inv.invoiceNumber} to ${inv.client.email ?? inv.client.name}?`,
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Send", onPress: () => sendMutation.mutate() },
                ]
              )
            }
            disabled={sendMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Send invoice to client"
            style={[s.actionBtn, { backgroundColor: "#2563EB" }]}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <NativeIcon name="send" size={18} color="#FFFFFF" decorative />
                <Text style={s.actionBtnLightText}>
                  {inv.status === "OVERDUE" ? "Send Reminder" : "Send Invoice"}
                </Text>
              </>
            )}
          </NativePressable>
        ) : null}

        <NativePressable
          haptic="light"
          onPress={downloadPdf}
          disabled={downloading}
          accessibilityRole="button"
          accessibilityLabel="Download and share PDF"
          style={[
            s.actionBtn,
            {
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            },
          ]}
        >
          {downloading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <NativeIcon name="download" size={18} color={colors.text} decorative />
              <Text style={[s.actionBtnOutlineText, { color: colors.text }]}>
                Download & Share PDF
              </Text>
            </>
          )}
        </NativePressable>
      </View>
    </ScrollView>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        dr.row,
        !last && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.borderSubtle,
        },
      ]}
    >
      <Text style={[dr.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[dr.value, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const dr = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    gap: spacing.sm,
  },
  label: { ...typography.callout },
  value: { ...typography.callout, fontWeight: "600", maxWidth: "62%", textAlign: "right" },
});

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { justifyContent: "center" },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 16,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  headerIconBtn: {
    minWidth: 40,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  heroCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  heroNum: {
    ...typography.callout,
    ...typography.mono,
    fontWeight: "600",
  },
  heroTotal: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700",
    ...typography.mono,
  },
  heroClient: {
    ...typography.body,
    marginTop: 4,
  },
  dateStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.md,
    paddingTop: spacing.sm + 2,
  },
  dateCol: { gap: 2 },
  dateColRight: { gap: 2, alignItems: "flex-end" },
  dateLabel: { ...typography.eyebrow },
  dateValue: { ...typography.callout, fontWeight: "600" },
  sectionLabel: {
    ...typography.eyebrow,
    marginBottom: spacing.xs,
    marginLeft: 2,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  lineItem: { paddingVertical: 13 },
  lineTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: 4,
  },
  lineDesc: { ...typography.bodyStrong, flex: 1 },
  lineAmt: { ...typography.bodyStrong, ...typography.mono },
  lineSub: { ...typography.caption, ...typography.mono },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 11,
  },
  totalLabel: { ...typography.callout },
  totalVal: { ...typography.callout, ...typography.mono, fontWeight: "500" },
  totalDueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalDueLabel: { ...typography.callout, fontWeight: "700", letterSpacing: 0.6 },
  totalDueVal: { fontSize: 20, fontWeight: "700", ...typography.mono },
  noteText: { ...typography.body, paddingVertical: 14 },
  actions: { gap: spacing.xs + 2, marginTop: spacing.xs },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minHeight: touchTarget.minHeight + 4,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  actionBtnLightText: {
    ...typography.headline,
    color: "#FFFFFF",
  },
  actionBtnOutlineText: {
    ...typography.bodyStrong,
  },
});
