import React from "react";
import { Tabs, Redirect } from "expo-router";
import { useAuthStore } from "@/store/auth";
import { View, Text } from "react-native";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: "◼",
    Invoices: "◻",
    Clients: "◉",
    Settings: "◈",
  };
  return (
    <View style={{ alignItems: "center", paddingTop: 4 }}>
      <Text style={{ fontSize: 16, color: focused ? "#C9A84C" : "#6B7280" }}>
        {icons[label] ?? "●"}
      </Text>
      <Text style={{ fontSize: 10, color: focused ? "#C9A84C" : "#6B7280", marginTop: 2, fontWeight: "600" }}>
        {label}
      </Text>
    </View>
  );
}

export default function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0A1628",
          borderTopWidth: 1,
          borderTopColor: "#1E3050",
          height: 64,
          paddingBottom: 0,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Dashboard" focused={focused} /> }}
      />
      <Tabs.Screen
        name="invoices/index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Invoices" focused={focused} /> }}
      />
      <Tabs.Screen
        name="clients/index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Clients" focused={focused} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Settings" focused={focused} /> }}
      />
      {/* Hidden from tabs but accessible via router.push */}
      <Tabs.Screen name="invoices/[id]" options={{ href: null }} />
      <Tabs.Screen name="invoices/new" options={{ href: null }} />
    </Tabs>
  );
}
