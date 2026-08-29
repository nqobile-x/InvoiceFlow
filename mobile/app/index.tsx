import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/auth";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628" }}>
        <ActivityIndicator color="#C9A84C" size="large" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? "/(app)/dashboard" : "/(auth)/login"} />;
}
