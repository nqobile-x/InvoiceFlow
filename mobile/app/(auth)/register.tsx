import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { Link, router } from "expo-router";
import { authApi } from "@/services/apiMethods";
import { useAuthStore } from "@/store/auth";

export default function RegisterScreen() {
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  function set(field: keyof typeof form) {
    return (value: string) => setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleRegister() {
    if (!form.firstName || !form.email || !form.password) {
      Alert.alert("Required", "Please fill in all required fields.");
      return;
    }
    if (form.password.length < 8) {
      Alert.alert("Weak password", "Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      await login(
        { id: data.userId, email: data.email, firstName: data.firstName,
          lastName: data.lastName, hasBusinessProfile: data.hasBusinessProfile },
        data.accessToken
      );
      router.replace("/(app)/dashboard");
    } catch {
      Alert.alert("Registration failed", "Email may already be in use.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.brand}>
          <Text style={s.brandTitle}>InvoiceFlow</Text>
          <Text style={s.brandSub}>Create your account</Text>
        </View>

        <View style={s.card}>
          <Text style={s.heading}>Get started</Text>

          <View style={s.row}>
            <View style={s.half}>
              <Text style={s.label}>First name *</Text>
              <TextInput style={s.input} value={form.firstName} onChangeText={set("firstName")}
                placeholder="Nqobile" placeholderTextColor="#6B7280" autoCapitalize="words" />
            </View>
            <View style={s.half}>
              <Text style={s.label}>Last name</Text>
              <TextInput style={s.input} value={form.lastName} onChangeText={set("lastName")}
                placeholder="Sibiya" placeholderTextColor="#6B7280" autoCapitalize="words" />
            </View>
          </View>

          <Text style={s.label}>Email address *</Text>
          <TextInput style={s.input} value={form.email} onChangeText={set("email")}
            placeholder="you@example.com" placeholderTextColor="#6B7280"
            autoCapitalize="none" keyboardType="email-address" autoComplete="email" />

          <Text style={s.label}>Password *</Text>
          <TextInput style={s.input} value={form.password} onChangeText={set("password")}
            placeholder="Min 8 characters" placeholderTextColor="#6B7280"
            secureTextEntry autoComplete="new-password" />

          <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#0A1628" />
              : <Text style={s.btnText}>Create account</Text>
            }
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login">
              <Text style={s.link}>Sign in</Text>
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
  brandSub: { fontSize: 13, color: "rgba(255,255,255,0.5)" },
  card: { backgroundColor: "#F8F6F1", padding: 24 },
  heading: { fontSize: 22, fontWeight: "700", color: "#0A1628", marginBottom: 20 },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
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
