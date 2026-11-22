import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { dashboardApi, type InvoiceSummary } from "../../src/services/apiMethods";
import { useAuthStore } from "../../src/store/auth";
import { useTheme } from "../../src/theme/ThemeProvider";
import {
  motion,
  radius,
  spacing,
  touchTarget,
  typography,
  type InvoiceStatusKey,
} from "../../src/theme/tokens";
import { formatCurrency, formatDate } from "../../src/utils/currency";
import { haptics } from "../../src/utils/haptics";
import { NativeIcon, type AppIconName } from "../../src/components/NativeIcon";
import { NativePressable } from "../../src/components/NativePressable";
import { StatusBadge } from "../../src/components/StatusBadge";
import { DashboardSkeleton } from "../../src/components/Skeleton";
import { StateView } from "../../src/components/StateView";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [refreshing, setRefreshing] = useState(false);

  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => dashboardApi.summary().then((r) => r.data),
  });

  const recentQuery = useQuery({
    queryKey: ["dashboard-recent"],
    queryFn: () => dashboardApi.recentInvoices().then((r) => r.data),
  });

  const isInitialLoading =
    (summaryQuery.isLoading && !summaryQuery.data) ||
    (recentQuery.isLoading && !recentQuery.data);
  const isError = summaryQuery.isError && recentQuery.isError;

  const onRefresh = useCallback(async () => {
    haptics.light();
    setRefreshing(true);
    try {
      await Promise.all([summaryQuery.refetch(), recentQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [summaryQuery, recentQuery]);

  const summary = summaryQuery.data;
  const recent = recentQuery.data ?? [];
  const currency = summary?.currency ?? "ZAR";
  const totalInvoiced = Number(summary?.totalInvoiced) || 0;
  const totalPaid = Number(summary?.totalPaid) || 0;
  const collectionPct =
    totalInvoiced > 0 ? Math.min(100, Math.round((totalPaid / totalInvoiced) * 100)) : 0;

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();

  return (
    <ScrollView
      style={[s.scroll, { backgroundColor: colors.bg }]}
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
      {/* Greeting Header */}
      <View style={s.greetingBlock}>
        <Text style={[s.greeting, { color: colors.textSecondary }]}>{getGreeting()}</Text>
        <Text style={[s.userName, { color: colors.text }]} numberOfLines={1}>
          {displayName || "Welcome back"}
        </Text>
      </View>

      {isInitialLoading ? (
        <DashboardSkeleton />
      ) : isError ? (
        <StateView
          icon="alert"
          tone="danger"
          title="Could not load dashboard"
          description="Check your internet connection and pull down or tap below to retry."
          actionLabel="Try Again"
          onAction={onRefresh}
        />
      ) : (
        <>
          {/* KPI 2x2 Grid */}
          <View style={s.grid}>
            <KpiCard
              label="Invoiced"
              value={formatCurrency(summary?.totalInvoiced ?? 0, currency)}
              icon="invoices"
              accent={colors.info}
              accentBg={colors.infoBg}
              index={0}
              reducedMotion={reducedMotion}
            />
            <KpiCard
              label="Collected"
              value={formatCurrency(summary?.totalPaid ?? 0, currency)}
              icon="check-circle"
              accent={colors.success}
              accentBg={colors.successBg}
              index={1}
              reducedMotion={reducedMotion}
            />
            <KpiCard
              label="Outstanding"
              value={formatCurrency(summary?.totalOutstanding ?? 0, currency)}
              icon="clock"
              accent={colors.accentText}
              accentBg={colors.accentSoft}
              index={2}
              reducedMotion={reducedMotion}
            />
            <KpiCard
              label="Overdue"
              value={formatCurrency(summary?.totalOverdue ?? 0, currency)}
              icon="alert"
              accent={colors.danger}
              accentBg={colors.dangerBg}
              index={3}
              reducedMotion={reducedMotion}
            />
          </View>

          {/* Collection Rate Strip */}
          {totalInvoiced > 0 ? (
            <View
              style={[
                s.progressCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={s.progressTop}>
                <Text style={[s.progressLabel, { color: colors.textSecondary }]}>
                  Collection rate
                </Text>
                <Text style={[s.progressPct, { color: colors.text }]}>{collectionPct}%</Text>
              </View>
              <View style={[s.progressTrack, { backgroundColor: colors.surfaceElevated }]}>
                <View
                  style={[
                    s.progressFill,
                    { backgroundColor: colors.success, width: `${collectionPct}%` },
                  ]}
                />
              </View>
            </View>
          ) : null}

          {/* Recent Invoices Section */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: colors.textMuted }]}>RECENT INVOICES</Text>
            <NativePressable
              haptic="selection"
              disableScale
              onPress={() => router.push("/(tabs)/invoices")}
              hitSlop={touchTarget.hitSlop}
              accessibilityRole="button"
              accessibilityLabel="View all invoices"
              style={s.viewAllBtn}
            >
              <Text style={[s.viewAllText, { color: colors.accentText }]}>View all</Text>
              <NativeIcon name="chevron-right" size={16} color={colors.accentText} decorative />
            </NativePressable>
          </View>

          {recent.length === 0 ? (
            <View
              style={[
                s.emptyCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <StateView
                icon="invoices-outline"
                title="No invoices yet"
                description="Create your first VAT-ready invoice and send it straight to your client."
                actionLabel="Create Invoice"
                onAction={() => router.push("/invoices/new")}
              />
            </View>
          ) : (
            <View style={s.recentList}>
              {recent.slice(0, 8).map((inv, idx) => (
                <RecentInvoiceRow
                  key={inv.id}
                  invoice={inv}
                  index={idx}
                  reducedMotion={reducedMotion}
                  onPress={() => router.push(`/invoices/${inv.id}`)}
                />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function KpiCard({
  label,
  value,
  icon,
  accent,
  accentBg,
  index,
  reducedMotion,
}: {
  label: string;
  value: string;
  icon: AppIconName;
  accent: string;
  accentBg: string;
  index: number;
  reducedMotion: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Animated.View
      entering={
        reducedMotion
          ? undefined
          : FadeInDown.delay(index * motion.staggerStep).duration(motion.standardDuration)
      }
      style={[
        kpi.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderTopColor: accent,
        },
      ]}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={kpi.topRow}>
        <Text style={[kpi.label, { color: colors.textSecondary }]} numberOfLines={1}>
          {label}
        </Text>
        <View style={[kpi.iconPill, { backgroundColor: accentBg }]}>
          <NativeIcon name={icon} size={14} color={accent} decorative />
        </View>
      </View>
      <Text
        style={[kpi.value, { color: colors.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {value}
      </Text>
    </Animated.View>
  );
}

function RecentInvoiceRow({
  invoice,
  index,
  reducedMotion,
  onPress,
}: {
  invoice: InvoiceSummary;
  index: number;
  reducedMotion: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const statusKey = (
    invoice.status in colors.status ? invoice.status : "DRAFT"
  ) as InvoiceStatusKey;
  const barColor = colors.status[statusKey].accent;

  return (
    <Animated.View
      entering={
        reducedMotion
          ? undefined
          : FadeInDown.delay(Math.min(index, 5) * motion.staggerStep).duration(
              motion.quickDuration
            )
      }
    >
      <NativePressable
        haptic="light"
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${invoice.invoiceNumber}, ${invoice.clientName}, ${formatCurrency(
          invoice.total,
          invoice.currency
        )}, ${invoice.status}`}
        style={[
          row.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={[row.accent, { backgroundColor: barColor }]} />
        <View style={row.left}>
          <Text style={[row.number, { color: colors.text }]} numberOfLines={1}>
            {invoice.invoiceNumber}
          </Text>
          <Text style={[row.client, { color: colors.textSecondary }]} numberOfLines={1}>
            {invoice.clientName}
          </Text>
          <Text style={[row.due, { color: colors.textMuted }]} numberOfLines={1}>
            Due {formatDate(invoice.dueDate)}
          </Text>
        </View>
        <View style={row.right}>
          <Text style={[row.amount, { color: colors.text }]} numberOfLines={1}>
            {formatCurrency(invoice.total, invoice.currency)}
          </Text>
          <StatusBadge status={invoice.status} />
        </View>
      </NativePressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  greetingBlock: {
    marginBottom: spacing.md,
  },
  greeting: {
    ...typography.caption,
    fontWeight: "500",
  },
  userName: {
    ...typography.title,
    marginTop: 2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  progressCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  progressLabel: {
    ...typography.caption,
    fontWeight: "600",
  },
  progressPct: {
    ...typography.callout,
    ...typography.mono,
    fontWeight: "700",
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.pill,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.eyebrow,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: touchTarget.minHeight,
    paddingLeft: spacing.xs,
  },
  viewAllText: {
    ...typography.callout,
    fontWeight: "600",
  },
  recentList: {
    gap: spacing.xs,
  },
  emptyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
  },
});

const kpi = StyleSheet.create({
  card: {
    flexBasis: "47%",
    flexGrow: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderTopWidth: 3,
    padding: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  label: {
    ...typography.eyebrow,
    flex: 1,
  },
  iconPill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "700",
    ...typography.mono,
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
  left: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    gap: 2,
  },
  number: {
    ...typography.bodyStrong,
    ...typography.mono,
  },
  client: {
    ...typography.caption,
  },
  due: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  right: {
    alignItems: "flex-end",
    paddingVertical: spacing.sm + 2,
    paddingRight: spacing.md,
    gap: 6,
  },
  amount: {
    ...typography.bodyStrong,
    ...typography.mono,
  },
});
