import { Platform, StyleSheet, Text } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { NativeIcon } from "../../src/components/NativeIcon";
import { NativePressable } from "../../src/components/NativePressable";
import { radius, spacing } from "../../src/theme/tokens";
import { haptics } from "../../src/utils/haptics";

function HeaderNewInvoiceButton() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <NativePressable
      haptic="light"
      onPress={() => router.push("/invoices/new")}
      accessibilityRole="button"
      accessibilityLabel="Create new invoice"
      style={[styles.headerCta, { backgroundColor: colors.accent }]}
    >
      <NativeIcon name="plus" size={16} color={colors.onAccent} decorative />
      <Text style={[styles.headerCtaText, { color: colors.onAccent }]}>New</Text>
    </NativePressable>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const bottomPad = Math.max(insets.bottom, 8);
  const tabBarHeight = (Platform.OS === "ios" ? 50 : 58) + bottomPad;

  return (
    <Tabs
      screenListeners={{
        tabPress: () => haptics.selection(),
      }}
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.headerBg,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.headerBorder,
        },
        headerTitleStyle: {
          color: colors.headerText,
          fontSize: 20,
          fontWeight: "700",
        },
        headerTintColor: colors.headerText,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: bottomPad,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarHideOnKeyboard: Platform.OS === "android",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarLabel: "Dashboard",
          headerRight: () => <HeaderNewInvoiceButton />,
          tabBarIcon: ({ color, focused }) => (
            <NativeIcon
              name={focused ? "dashboard" : "dashboard-outline"}
              size={22}
              color={color}
              decorative
            />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: "Invoices",
          tabBarLabel: "Invoices",
          headerRight: () => <HeaderNewInvoiceButton />,
          tabBarIcon: ({ color, focused }) => (
            <NativeIcon
              name={focused ? "invoices" : "invoices-outline"}
              size={22}
              color={color}
              decorative
            />
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: "Clients",
          tabBarLabel: "Clients",
          tabBarIcon: ({ color, focused }) => (
            <NativeIcon
              name={focused ? "clients" : "clients-outline"}
              size={22}
              color={color}
              decorative
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <NativeIcon
              name={focused ? "settings" : "settings-outline"}
              size={22}
              color={color}
              decorative
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: spacing.md,
    paddingHorizontal: 14,
    minHeight: 36,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  headerCtaText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
