import React, { memo, useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { invoiceApi, type InvoiceSummary } from "../../src/services/apiMethods";
import { useTheme } from "../../src/theme/ThemeProvider";
import {
  radius,
  spacing,
  touchTarget,
  typography,
  type InvoiceStatusKey,
} from "../../src/theme/tokens";
import { formatCurrency, formatDate } from "../../src/utils/currency";
import { haptics } from "../../src/utils/haptics";
import { NativeIcon } from "../../src/components/NativeIcon";
import { NativePressable } from "../../src/components/NativePressable";
import { StatusBadge } from "../../src/components/StatusBadge";
import { InvoiceListSkeleton } from "../../src/components/Skeleton";
import { StateView } from "../../src/components/StateView";
import { BottomSheetModal } from "../../src/components/BottomSheetModal";

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "SENT", label: "Sent" },
  { key: "VIEWED", label: "Viewed" },
  { key: "PAID", label: "Paid" },
  { key: "OVERDUE", label: "Overdue" },
] as const;

export default function InvoicesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const [actionInvoice, setActionInvoice] = useState<InvoiceSummary | null>(null);

  const query = useQuery({
    queryKey: ["invoices", activeTab],
    queryFn: () =>
      invoiceApi
        .list({ status: activeTab === "ALL" ? undefined : activeTab, size: 50 })
        .then((r) => r.data.content),
  });

  const invalidateAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["invoices"] });
    qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    qc.invalidateQueries({ queryKey: ["dashboard-recent"] });
  }, [qc]);

  const sendMutation = useMutation({
    mutationFn: (id: string) => invoiceApi.send(id),
    onSuccess: () => {
      haptics.success();
      invalidateAll();
    },
    onError: () => {
      haptics.error();
      Alert.alert("Could not send", "Please try sending this invoice again.");
    },
  });

  const paidMutation = useMutation({
    mutationFn: (inv: InvoiceSummary) =>
      invoiceApi.markPaid(inv.id, {
        amount: inv.total,
        paymentMethod: "BANK_TRANSFER",
        reference: `Manual-${inv.invoiceNumber}`,
        paidAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      haptics.success();
      invalidateAll();
    },
    onError: () => {
      haptics.error();
      Alert.alert("Could not update", "Failed to mark invoice as paid.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoiceApi.delete(id),
    onSuccess: () => {
      haptics.success();
      invalidateAll();
    },
    onError: () => {
      haptics.error();
      Alert.alert("Could not delete", "Only draft invoices can be deleted.");
    },
  });

  const onRefresh = useCallback(async () => {
    haptics.light();
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  const handleSend = useCallback(
    (inv: InvoiceSummary) => {
      Alert.alert("Send Invoice", `Email ${inv.invoiceNumber} to ${inv.clientName}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Send", onPress: () => sendMutation.mutate(inv.id) },
      ]);
    },
    [sendMutation]
  );

  const handleMarkPaid = useCallback(
    (inv: InvoiceSummary) => {
      Alert.alert(
        "Mark as Paid",
        `Record full payment (${formatCurrency(inv.total, inv.currency)}) for ${inv.invoiceNumber}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Mark Paid", onPress: () => paidMutation.mutate(inv) },
        ]
      );
    },
    [paidMutation]
  );

  const handleDelete = useCallback(
    (inv: InvoiceSummary) => {
      haptics.warning();
      Alert.alert("Delete Draft", `Delete ${inv.invoiceNumber}? This cannot be undone.`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(inv.id),
        },
      ]);
    },
    [deleteMutation]
  );

  const invoices = query.data ?? [];
  const isInitialLoading = query.isLoading && !query.data;

  const renderItem = useCallback(
    ({ item }: { item: InvoiceSummary }) => (
      <SwipeableInvoiceRow
        item={item}
        onPress={() => router.push(`/invoices/${item.id}`)}
        onSend={() => handleSend(item)}
        onMarkPaid={() => handleMarkPaid(item)}
        onDelete={() => handleDelete(item)}
        onOpenActions={() => {
          haptics.light();
          setActionInvoice(item);
        }}
      />
    ),
    [router, handleSend, handleMarkPaid, handleDelete]
  );

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* Horizontal Status Filter Pills */}
      <View style={[s.filterBar, { borderBottomColor: colors.borderSubtle }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterScroll}
        >
          {FILTERS.map((f) => {
            const active = activeTab === f.key;
            return (
              <NativePressable
                key={f.key}
                haptic="selection"
                onPress={() => setActiveTab(f.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[
                  s.chip,
                  {
                    backgroundColor: active ? colors.accent : colors.surface,
                    borderColor: active ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    s.chipText,
                    { color: active ? colors.onAccent : colors.textSecondary },
                  ]}
                >
                  {f.label}
                </Text>
              </NativePressable>
            );
          })}
        </ScrollView>
      </View>

      {isInitialLoading ? (
        <InvoiceListSkeleton />
      ) : query.isError ? (
        <StateView
          icon="alert"
          tone="danger"
          title="Could not load invoices"
          description="Something went wrong while fetching your invoices."
          actionLabel="Retry"
          onAction={onRefresh}
        />
      ) : (
        <FlashList
          data={invoices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          ItemSeparatorComponent={ListGap}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
              progressBackgroundColor={colors.surface}
            />
          }
          ListEmptyComponent={
            <StateView
              icon="invoices-outline"
              title={activeTab === "ALL" ? "No invoices yet" : `No ${activeTab.toLowerCase()} invoices`}
              description={
                activeTab === "ALL"
                  ? "Create your first invoice to start getting paid faster."
                  : "Pull to refresh or switch filter tabs to view other invoices."
              }
              actionLabel={activeTab === "ALL" ? "Create Invoice" : "Show All"}
              onAction={() =>
                activeTab === "ALL" ? router.push("/invoices/new") : setActiveTab("ALL")
              }
            />
          }
        />
      )}

      {/* Accessible Action Sheet Fallback for Swipe Actions */}
      <BottomSheetModal
        visible={!!actionInvoice}
        title={actionInvoice ? actionInvoice.invoiceNumber : "Invoice Actions"}
        onClose={() => setActionInvoice(null)}
      >
        {actionInvoice ? (
          <View style={s.sheetBody}>
            <Text style={[s.sheetSub, { color: colors.textSecondary }]}>
              {actionInvoice.clientName} ·{" "}
              {formatCurrency(actionInvoice.total, actionInvoice.currency)}
            </Text>

            <SheetAction
              icon="invoices"
              label="View Invoice Details"
              onPress={() => {
                const targetId = actionInvoice.id;
                setActionInvoice(null);
                router.push(`/invoices/${targetId}`);
              }}
            />
            {(actionInvoice.status === "DRAFT" || actionInvoice.status === "OVERDUE") ? (
              <SheetAction
                icon="send"
                label="Send to Client"
                tone="info"
                onPress={() => {
                  const inv = actionInvoice;
                  setActionInvoice(null);
                  handleSend(inv);
                }}
              />
            ) : null}
            {(actionInvoice.status === "SENT" ||
              actionInvoice.status === "VIEWED" ||
              actionInvoice.status === "OVERDUE") ? (
              <SheetAction
                icon="check-circle"
                label="Mark as Paid"
                tone="success"
                onPress={() => {
                  const inv = actionInvoice;
                  setActionInvoice(null);
                  handleMarkPaid(inv);
                }}
              />
            ) : null}
            {actionInvoice.status === "DRAFT" ? (
              <SheetAction
                icon="delete"
                label="Delete Draft"
                tone="danger"
                onPress={() => {
                  const inv = actionInvoice;
                  setActionInvoice(null);
                  handleDelete(inv);
                }}
              />
            ) : null}
          </View>
        ) : null}
      </BottomSheetModal>
    </View>
  );
}

function ListGap() {
  return <View style={{ height: spacing.xs + 2 }} />;
}

function SheetAction({
  icon,
  label,
  tone = "default",
  onPress,
}: {
  icon: "invoices" | "send" | "check-circle" | "delete";
  label: string;
  tone?: "default" | "info" | "success" | "danger";
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const fg =
    tone === "danger"
      ? colors.danger
      : tone === "success"
        ? colors.success
        : tone === "info"
          ? colors.info
          : colors.text;

  return (
    <NativePressable
      haptic="light"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[s.sheetAction, { backgroundColor: colors.surfaceElevated }]}
    >
      <NativeIcon name={icon} size={20} color={fg} decorative />
      <Text style={[s.sheetActionText, { color: fg }]}>{label}</Text>
    </NativePressable>
  );
}

const SwipeableInvoiceRow = memo(function SwipeableInvoiceRow({
  item,
  onPress,
  onSend,
  onMarkPaid,
  onDelete,
  onOpenActions,
}: {
  item: InvoiceSummary;
  onPress: () => void;
  onSend: () => void;
  onMarkPaid: () => void;
  onDelete: () => void;
  onOpenActions: () => void;
}) {
  const { colors } = useTheme();
  const swipeRef = useRef<SwipeableMethods>(null);
  const statusKey = (
    item.status in colors.status ? item.status : "DRAFT"
  ) as InvoiceStatusKey;
  const accentColor = colors.status[statusKey].accent;

  const canSend = item.status === "DRAFT" || item.status === "OVERDUE";
  const canPay =
    item.status === "SENT" || item.status === "VIEWED" || item.status === "OVERDUE";
  const canDelete = item.status === "DRAFT";

  const renderRightActions = () => {
    if (!canSend && !canPay && !canDelete) return null;
    return (
      <View style={row.swipeGroup}>
        {canSend ? (
          <Pressable
            onPress={() => {
              swipeRef.current?.close();
              haptics.medium();
              onSend();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Send ${item.invoiceNumber}`}
            style={[row.swipeBtn, { backgroundColor: "#2563EB" }]}
          >
            <NativeIcon name="send" size={18} color="#FFFFFF" decorative />
            <Text style={row.swipeLabel}>Send</Text>
          </Pressable>
        ) : null}
        {canPay ? (
          <Pressable
            onPress={() => {
              swipeRef.current?.close();
              haptics.medium();
              onMarkPaid();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${item.invoiceNumber} paid`}
            style={[row.swipeBtn, { backgroundColor: "#059669" }]}
          >
            <NativeIcon name="check-circle" size={18} color="#FFFFFF" decorative />
            <Text style={row.swipeLabel}>Paid</Text>
          </Pressable>
        ) : null}
        {canDelete ? (
          <Pressable
            onPress={() => {
              swipeRef.current?.close();
              haptics.warning();
              onDelete();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.invoiceNumber}`}
            style={[row.swipeBtn, { backgroundColor: "#DC2626" }]}
          >
            <NativeIcon name="delete" size={18} color="#FFFFFF" decorative />
            <Text style={row.swipeLabel}>Delete</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={2}
      rightThreshold={36}
      overshootRight={false}
      activeOffsetX={[-14, 14]}
      failOffsetY={[-12, 12]}
      onSwipeableWillOpen={() => haptics.light()}
      renderRightActions={renderRightActions}
    >
      <NativePressable
        haptic="light"
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${item.invoiceNumber}, ${item.clientName}, ${formatCurrency(
          item.total,
          item.currency
        )}, ${item.status}, due ${formatDate(item.dueDate)}`}
        style={[
          row.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={[row.accent, { backgroundColor: accentColor }]} />
        <View style={row.body}>
          <View style={row.top}>
            <Text style={[row.number, { color: colors.text }]} numberOfLines={1}>
              {item.invoiceNumber}
            </Text>
            <Text style={[row.amount, { color: colors.text }]} numberOfLines={1}>
              {formatCurrency(item.total, item.currency)}
            </Text>
          </View>
          <View style={row.mid}>
            <Text style={[row.client, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.clientName}
            </Text>
            <StatusBadge status={item.status} />
          </View>
          <View style={row.bottom}>
            <View style={row.dueWrap}>
              <NativeIcon name="calendar" size={12} color={colors.textMuted} decorative />
              <Text style={[row.date, { color: colors.textMuted }]}>
                Due {formatDate(item.dueDate)}
              </Text>
            </View>
          </View>
        </View>
        <Pressable
          onPress={onOpenActions}
          hitSlop={touchTarget.hitSlop}
          accessibilityRole="button"
          accessibilityLabel={`More actions for ${item.invoiceNumber}`}
          style={row.moreBtn}
        >
          <NativeIcon name="more" size={20} color={colors.textMuted} decorative />
        </Pressable>
      </NativePressable>
    </ReanimatedSwipeable>
  );
});

const s = StyleSheet.create({
  root: { flex: 1 },
  filterBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: 14,
    minHeight: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sheetBody: {
    padding: spacing.lg,
    gap: spacing.xs + 2,
  },
  sheetSub: {
    ...typography.callout,
    marginBottom: spacing.xs,
  },
  sheetAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: touchTarget.minHeight + 4,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  sheetActionText: {
    ...typography.bodyStrong,
  },
});

const row = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  accent: {
    width: 4,
    alignSelf: "stretch",
  },
  body: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    gap: 6,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.xs,
  },
  number: {
    ...typography.bodyStrong,
    ...typography.mono,
    flex: 1,
  },
  amount: {
    ...typography.headline,
    ...typography.mono,
  },
  mid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.xs,
  },
  client: {
    ...typography.callout,
    flex: 1,
  },
  bottom: {
    flexDirection: "row",
    alignItems: "center",
  },
  dueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  date: {
    fontSize: 12,
    lineHeight: 16,
  },
  moreBtn: {
    minWidth: touchTarget.minWidth,
    minHeight: touchTarget.minHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  swipeGroup: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingLeft: spacing.xs,
    gap: 6,
  },
  swipeBtn: {
    width: 76,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  swipeLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
