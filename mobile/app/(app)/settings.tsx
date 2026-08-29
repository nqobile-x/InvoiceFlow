import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { businessApi, authApi, type Business } from "@/services/apiMethods";
import { useAuthStore } from "@/store/auth";

type Form = Omit<Business, "id" | "logoUrl">;

const blankForm = (): Form => ({
  name: "", registrationNumber: "", vatNumber: "", addressLine1: "",
  city: "", province: "", postalCode: "", country: "ZA", phone: "", email: "",
  website: "", primaryColor: "#0A1628", invoicePrefix: "INV", paymentTermsDays: 30,
  bankName: "", bankAccountNumber: "", bankBranchCode: "", currency: "ZAR",
  watermarkEnabled: false, watermarkText: "",
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const qc = useQueryClient();
  const { user, logout, updateHasBusinessProfile } = useAuthStore();
  const hasProfile = user?.hasBusinessProfile ?? false;
  const [form, setForm] = useState<Form>(blankForm());
  const [saved, setSaved] = useState(false);

  const { data: business, isLoading } = useQuery({
    queryKey: ["business"],
    queryFn: () => businessApi.get().then((r) => r.data),
    enabled: hasProfile,
    retry: false,
  });

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name,
        registrationNumber: business.registrationNumber ?? "",
        vatNumber: business.vatNumber ?? "",
        addressLine1: business.addressLine1 ?? "",
        city: business.city ?? "",
        province: business.province ?? "",
        postalCode: business.postalCode ?? "",
        country: business.country ?? "ZA",
        phone: business.phone ?? "",
        email: business.email ?? "",
        website: business.website ?? "",
        primaryColor: business.primaryColor ?? "#0A1628",
        invoicePrefix: business.invoicePrefix ?? "INV",
        paymentTermsDays: business.paymentTermsDays ?? 30,
        bankName: business.bankName ?? "",
        bankAccountNumber: business.bankAccountNumber ?? "",
        bankBranchCode: business.bankBranchCode ?? "",
        currency: business.currency ?? "ZAR",
        watermarkEnabled: business.watermarkEnabled ?? false,
        watermarkText: business.watermarkText ?? "",
      });
    }
  }, [business]);

  const saveMutation = useMutation({
    mutationFn: () => hasProfile ? businessApi.update(form) : businessApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business"] });
      if (!hasProfile) updateHasBusinessProfile(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: () => Alert.alert("Error", "Could not save settings."),
  });

  function setF(field: keyof Form) {
    return (v: string | boolean | number) => setForm((f) => ({ ...f, [field]: v }));
  }

  async function handleLogout() {
    Alert.alert("Sign out", "Sign out of InvoiceFlow?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out", style: "destructive", onPress: async () => {
          try { await authApi.logout(); } catch {}
          await logout();
          router.replace("/(auth)/login");
        }
      },
    ]);
  }

  if (isLoading && hasProfile) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Text style={s.title}>Settings</Text>
        </View>
        <ActivityIndicator color="#C9A84C" style={{ marginTop: 48 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Settings</Text>
        <TouchableOpacity onPress={handleLogout} activeOpacity={0.7}>
          <Text style={s.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {saved && (
        <View style={s.toast}>
          <Text style={s.toastText}>Settings saved ✓</Text>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

          {/* User info */}
          <View style={s.userBadge}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {(user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")}
              </Text>
            </View>
            <View>
              <Text style={s.userName}>{user?.firstName} {user?.lastName}</Text>
              <Text style={s.userEmail}>{user?.email}</Text>
            </View>
          </View>

          {/* Business Identity */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Business Identity</Text>
            <Field label="Business Name *">
              <TextInput style={s.input} value={form.name} onChangeText={setF("name")} placeholder="SUPPLYNEX" placeholderTextColor="#9CA3AF" />
            </Field>
            <Field label="Email">
              <TextInput style={s.input} value={form.email} onChangeText={setF("email")} placeholder="info@supplynex.co.za" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#9CA3AF" />
            </Field>
            <Field label="Phone">
              <TextInput style={s.input} value={form.phone} onChangeText={setF("phone")} placeholder="+27 11 000 0000" keyboardType="phone-pad" placeholderTextColor="#9CA3AF" />
            </Field>
            <Field label="Website">
              <TextInput style={s.input} value={form.website} onChangeText={setF("website")} placeholder="https://supplynex.co.za" autoCapitalize="none" keyboardType="url" placeholderTextColor="#9CA3AF" />
            </Field>
            <Field label="Registration Number">
              <TextInput style={s.input} value={form.registrationNumber} onChangeText={setF("registrationNumber")} placeholderTextColor="#9CA3AF" />
            </Field>
            <Field label="VAT Number">
              <TextInput style={s.input} value={form.vatNumber} onChangeText={setF("vatNumber")} keyboardType="numeric" placeholderTextColor="#9CA3AF" />
            </Field>
          </View>

          {/* Address */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Address</Text>
            <Field label="Street Address">
              <TextInput style={s.input} value={form.addressLine1} onChangeText={setF("addressLine1")} placeholderTextColor="#9CA3AF" />
            </Field>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Field label="City">
                  <TextInput style={s.input} value={form.city} onChangeText={setF("city")} placeholderTextColor="#9CA3AF" />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Postal Code">
                  <TextInput style={s.input} value={form.postalCode} onChangeText={setF("postalCode")} keyboardType="numeric" placeholderTextColor="#9CA3AF" />
                </Field>
              </View>
            </View>
            <Field label="Province">
              <TextInput style={s.input} value={form.province} onChangeText={setF("province")} placeholderTextColor="#9CA3AF" />
            </Field>
          </View>

          {/* Invoice Preferences */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Invoice Preferences</Text>
            <Field label="Invoice Prefix">
              <TextInput style={s.input} value={form.invoicePrefix} onChangeText={setF("invoicePrefix")} placeholder="INV" placeholderTextColor="#9CA3AF" />
            </Field>
            <Field label="Payment Terms (days)">
              <TextInput style={s.input} value={String(form.paymentTermsDays)} onChangeText={(v) => setF("paymentTermsDays")(Number(v))} keyboardType="numeric" placeholderTextColor="#9CA3AF" />
            </Field>
          </View>

          {/* Banking */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Banking Details</Text>
            <Field label="Bank Name">
              <TextInput style={s.input} value={form.bankName} onChangeText={setF("bankName")} placeholder="e.g. FNB, Standard Bank" placeholderTextColor="#9CA3AF" />
            </Field>
            <Field label="Account Number">
              <TextInput style={s.input} value={form.bankAccountNumber} onChangeText={setF("bankAccountNumber")} keyboardType="numeric" placeholderTextColor="#9CA3AF" />
            </Field>
            <Field label="Branch Code">
              <TextInput style={s.input} value={form.bankBranchCode} onChangeText={setF("bankBranchCode")} keyboardType="numeric" placeholderTextColor="#9CA3AF" />
            </Field>
          </View>

          {/* Watermark */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Invoice Watermark</Text>
            <View style={s.switchRow}>
              <Text style={s.switchLabel}>Add watermark to invoices</Text>
              <Switch
                value={form.watermarkEnabled ?? false}
                onValueChange={setF("watermarkEnabled")}
                trackColor={{ true: "#C9A84C", false: "#E2DDD6" }}
                thumbColor="#FFFFFF"
              />
            </View>
            {form.watermarkEnabled && (
              <Field label="Watermark Text (max 20 chars)">
                <TextInput style={s.input} value={form.watermarkText} onChangeText={setF("watermarkText")}
                  placeholder="e.g. SUPPLYNEX" maxLength={20} placeholderTextColor="#9CA3AF" />
              </Field>
            )}
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[s.saveBtn, saveMutation.isPending && { opacity: 0.7 }]}
            onPress={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            activeOpacity={0.85}
          >
            {saveMutation.isPending
              ? <ActivityIndicator color="#0A1628" />
              : <Text style={s.saveBtnText}>Save Settings</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F6F1" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
            backgroundColor: "#0A1628", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  title: { fontSize: 22, fontWeight: "700", color: "#FFFFFF" },
  signOut: { fontSize: 13, color: "rgba(255,255,255,0.5)" },
  toast: { backgroundColor: "#059669", paddingVertical: 10, paddingHorizontal: 20 },
  toastText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  userBadge: { flexDirection: "row", alignItems: "center", gap: 14,
               backgroundColor: "#FFFFFF", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E2DDD6" },
  avatar: { width: 44, height: 44, backgroundColor: "#0A1628", borderRadius: 22,
             justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#C9A84C" },
  userName: { fontSize: 15, fontWeight: "700", color: "#0A1628" },
  userEmail: { fontSize: 12, color: "#6B7280" },
  section: { backgroundColor: "#FFFFFF", marginHorizontal: 16, marginTop: 16, padding: 16 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase",
                  letterSpacing: 0.8, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: "600", color: "#4A5568", textTransform: "uppercase",
           letterSpacing: 0.8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#E2DDD6", backgroundColor: "#F8F6F1",
           paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#0A1628" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  switchLabel: { fontSize: 14, color: "#0A1628", flex: 1 },
  saveBtn: { backgroundColor: "#C9A84C", margin: 16, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#0A1628" },
});
