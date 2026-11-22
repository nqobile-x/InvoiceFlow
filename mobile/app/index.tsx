import { View, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { useAuthStore } from "../src/store/auth";
import { useTheme } from "../src/theme/ThemeProvider";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { colors } = useTheme();

  if (isLoading) {
    return <View style={[styles.container, { backgroundColor: colors.bg }]} />;
  }

  return <Redirect href={isAuthenticated ? "/(tabs)" : "/(auth)/login"} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
