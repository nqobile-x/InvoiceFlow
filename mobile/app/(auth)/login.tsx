import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { Link, router } from "expo-router";
import { authApi } from "@/services/apiMethods";
import { useAuthStore } from "@/store/auth";

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Required", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.login({ email: email.trim().toLowerCase(), password });
      await login(
        { id: data.userId, email: data.email, firstName: data.firstName,
          lastName: data.lastName, hasBusinessProfile: data.hasBusinessProfile },
        data.accessToken
      );
      router.replace("/(app)/dashboard");
    } catch {
      Alert.alert("Login failed", "Incorrect email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        {/* Brand mark */}
        <View style={s.brand}>
          <Text style={s.brandTitle}>InvoiceFlow</Text>
          <Text style={s.brandSub}>Professional invoicing for South African business</Text>
        </View>

        <View style={s.card}>
          <Text style={s.heading}>Sign in</Text>

          <Text style={s.label}>Email address</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#6B7280"
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#0A1628" />
              : <Text style={s.btnText}>Sign in</Text>
            }
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/register">
              <Text style={s.link}>Register</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#0A1628" },
  container: { flexGrow: 1, justifyContent: "center", padding: 24 },
  brand: { alignItems: "center", marginBottom: 40 },
  brandTitle: { fontSize: 32, fontWeight: "700", color: "#C9A84C", letterSpacing: 1, marginBottom: 6 },
  brandSub: { fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center" },
  card: { backgroundColor: "#F8F6F1", padding: 24 },
  heading: { fontSize: 22, fontWeight: "700", color: "#0A1628", marginBottom: 24 },
  label: { fontSize: 11, fontWeight: "600", color: "#4A5568", textTransform: "uppercase",
           letterSpacing: 0.8, marginBottom: 6 },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2DDD6",
           paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#0A1628",
           marginBottom: 16 },
  btn: { backgroundColor: "#C9A84C", paddingVertical: 14, alignItems: "center", marginTop: 8 },
  btnText: { fontSize: 15, fontWeight: "700", color: "#0A1628" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  footerText: { fontSize: 13, color: "#4A5568" },
  link: { fontSize: 13, fontWeight: "600", color: "#0A1628" },
});
