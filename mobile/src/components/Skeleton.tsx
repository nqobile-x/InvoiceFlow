import React, { useEffect } from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/tokens";

interface SkeletonBlockProps {
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonBlock({
  width = "100%",
  height,
  borderRadius = radius.sm,
  style,
}: SkeletonBlockProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 0.75;
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.42, { duration: 750, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [reducedMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.skeletonBase,
        },
        style,
        animatedStyle,
      ]}
    />
  );
}

export function DashboardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={s.container} accessibilityLabel="Loading dashboard">
      <View style={s.kpiGrid}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[s.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <SkeletonBlock width="52%" height={12} />
            <SkeletonBlock width="82%" height={24} style={{ marginTop: 12 }} />
          </View>
        ))}
      </View>
      <SkeletonBlock width={130} height={12} style={{ marginBottom: 12 }} />
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={[s.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={s.rowBetween}>
            <SkeletonBlock width="42%" height={16} />
            <SkeletonBlock width="28%" height={16} />
          </View>
          <View style={[s.rowBetween, { marginTop: 10 }]}>
            <SkeletonBlock width="56%" height={13} />
            <SkeletonBlock width={68} height={22} borderRadius={radius.pill} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function InvoiceListSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={s.listContainer} accessibilityLabel="Loading invoices">
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[s.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={s.rowBetween}>
            <SkeletonBlock width="40%" height={16} />
            <SkeletonBlock width="28%" height={17} />
          </View>
          <View style={[s.rowBetween, { marginTop: 10 }]}>
            <SkeletonBlock width="55%" height={14} />
            <SkeletonBlock width={68} height={22} borderRadius={radius.pill} />
          </View>
          <SkeletonBlock width="32%" height={12} style={{ marginTop: 10 }} />
        </View>
      ))}
    </View>
  );
}

export function ClientListSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={s.listContainer} accessibilityLabel="Loading clients">
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[s.clientCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <SkeletonBlock width={44} height={44} borderRadius={22} />
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBlock width="60%" height={16} />
            <SkeletonBlock width="44%" height={13} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function InvoiceDetailSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={s.container} accessibilityLabel="Loading invoice">
      <View style={[s.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={s.rowBetween}>
          <SkeletonBlock width="45%" height={24} />
          <SkeletonBlock width={72} height={24} borderRadius={radius.pill} />
        </View>
        <SkeletonBlock width="60%" height={34} style={{ marginTop: 14 }} />
        <SkeletonBlock width="48%" height={14} style={{ marginTop: 10 }} />
      </View>
      <View style={[s.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[s.rowBetween, { paddingVertical: 10 }]}>
            <SkeletonBlock width="30%" height={13} />
            <SkeletonBlock width="45%" height={13} />
          </View>
        ))}
      </View>
      <View style={[s.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {[0, 1].map((i) => (
          <View key={i} style={{ paddingVertical: 10, gap: 8 }}>
            <View style={s.rowBetween}>
              <SkeletonBlock width="58%" height={15} />
              <SkeletonBlock width="24%" height={15} />
            </View>
            <SkeletonBlock width="40%" height={12} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function SettingsSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={s.container} accessibilityLabel="Loading settings">
      <View style={[s.clientCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SkeletonBlock width={52} height={52} borderRadius={26} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBlock width="55%" height={18} />
          <SkeletonBlock width="70%" height={14} />
        </View>
      </View>
      <View style={[s.heroCard, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 }]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={[s.rowBetween, { paddingVertical: 12 }]}>
            <SkeletonBlock width="35%" height={14} />
            <SkeletonBlock width="42%" height={14} />
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.sm },
  listContainer: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, gap: spacing.sm },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  kpiCard: {
    flexBasis: "47%",
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  listCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  clientCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  heroCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
