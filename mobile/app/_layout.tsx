import { useEffect } from "react";
import { Platform, StyleSheet } from "react-native";
import { Stack, useRootNavigationState, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { useAuthStore } from "../src/store/auth";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function RootNavigator() {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const { isDark, colors, navigationTheme } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const rootNavState = useRootNavigationState();
  const isNavReady = !!rootNavState?.key;

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  useEffect(() => {
    if (isLoading || !isNavReady) return;
    const inAuth = segments[0] === "(auth)";
    if (!isAuthenticated && !inAuth) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuth) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, isNavReady, segments, router]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: Platform.OS === "ios",
          contentStyle: { backgroundColor: colors.bg },
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.headerText,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false, animation: "none" }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen
          name="invoices/new"
          options={{
            headerShown: true,
            title: "New Invoice",
            presentation: Platform.OS === "ios" ? "formSheet" : "modal",
            sheetGrabberVisible: true,
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="invoices/[id]"
          options={{
            headerShown: true,
            title: "Invoice",
            headerLargeTitle: Platform.OS === "ios",
          }}
        />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <RootNavigator />
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
