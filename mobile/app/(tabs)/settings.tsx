import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  type TextInput,
} from "react-native";
import { useNavigation } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { businessApi, authApi, type Business } from "../../src/services/apiMethods";
import { useAuthStore } from "../../src/store/auth";
import { useTheme, type ThemePreference } from "../../src/theme/ThemeProvider";
import { radius, spacing, touchTarget, typography } from "../../src/theme/tokens";
import { haptics } from "../../src/utils/haptics";
import { validatePositiveNumber, validateRequired } from "../../src/utils/validation";
import { NativeIcon, type AppIconName } from "../../src/components/NativeIcon";
import { NativePressable } from "../../src/components/NativePressable";
import { FormField } from "../../src/components/FormField";
import { SettingsSkeleton } from "../../src/components/Skeleton";
import { StateView } from "../../src/components/StateView";

type EditState = {
  name: string;
  phone: string;
  vatNumber: string;
  registrationNumber: string;
  invoicePrefix: string;
  currency: string;
  paymentTermsDays: string;
  bankName: string;
  bankAccountNumber: string;
  bankBranchCode: string;
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string;
};

function toEditState(b: Business): EditState {
  return {
    name: b.name ?? "",
    phone: b.phone ?? "",
    vatNumber: b.vatNumber ?? "",
    registrationNumber: b.registrationNumber ?? "",
    invoicePrefix: b.invoicePrefix ?? "INV",
    currency: b.currency ?? "ZAR",
    paymentTermsDays: String(b.paymentTermsDays ?? 30),
    bankName: b.bankName ?? "",
    bankAccountNumber: b.bankAccountNumber ?? "",
    bankBranchCode: b.bankBranchCode ?? "",
    addressLine1: b.addressLine1 ?? "",
    city: b.city ?? "",
    province: b.province ?? "",
    postalCode: b.postalCode ?? "",
  };
}

const THEME_OPTIONS: { key: ThemePreference; label: string; icon: AppIconName }[] = [
  { key: "system", label: "System", icon: "theme-system" },
  { key: "light", label: "Light", icon: "theme-light" },
  { key: "dark", label: "Dark", icon: "theme-dark" },
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { user, logout } = useAuthStore();
  const { colors, preference, setPreference } = useTheme();
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditState | null>(null);
  const [touched, setTouched] = useState<{ name?: boolean; terms?: boolean }>({});

  const phoneRef = useRef<TextInput>(null);
  const vatRef = useRef<TextInput>(null);
  const regRef = useRef<TextInput>(null);
  const prefixRef = useRef<TextInput>(null);
  const currencyRef = useRef<TextInput>(null);
  const termsRef = useRef<TextInput>(null);
  const streetRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const provinceRef = useRef<TextInput>(null);
  const postalRef = useRef<TextInput>(null);
  const bankRef = useRef<TextInput>(null);
  const accRef = useRef<TextInput>(null);
  const branchRef = useRef<TextInput>(null);

  const businessQuery = useQuery({
    queryKey: ["business"],
    queryFn: () => businessApi.get().then((r) => r.data),
    enabled: user?.hasBusinessProfile !== false,
  });

  const business = businessQuery.data;

  const saveMutation = useMutation({
    mutationFn: () =>
      businessApi.update({
        name: form!.name.trim(),
        phone: form!.phone.trim() || undefined,
        vatNumber: form!.vatNumber.trim() || undefined,
        registrationNumber: form!.registrationNumber.trim() || undefined,
        invoicePrefix: form!.invoicePrefix.trim() || "INV",
        currency: form!.currency.trim().toUpperCase() || "ZAR",
        paymentTermsDays: parseInt(form!.paymentTermsDays, 10) || 30,
        bankName: form!.bankName.trim() || undefined,
        bankAccountNumber: form!.bankAccountNumber.trim() || undefined,
        bankBranchCode: form!.bankBranchCode.trim() || undefined,
        addressLine1: form!.addressLine1.trim() || undefined,
        city: form!.city.trim() || undefined,
        province: form!.province.trim() || undefined,
        postalCode: form!.postalCode.trim() || undefined,
      }),
    onSuccess: () => {
      haptics.success();
      qc.invalidateQueries({ queryKey: ["business"] });
      setEditing(false);
      setForm(null);
      Alert.alert("Saved", "Your business profile has been updated.");
    },
    onError: () => {
      haptics.error();
      Alert.alert("Error", "Could not save changes. Please try again.");
    },
  });

  const startEdit = useCallback(() => {
    if (!business) return;
    haptics.light();
    setForm(toEditState(business));
    setTouched({});
    setEditing(true);
  }, [business]);

  const cancelEdit = useCallback(() => {
    haptics.light();
    setEditing(false);
    setForm(null);
  }, []);

  const handleSave = useCallback(() => {
    if (!form) return;
    setTouched({ name: true, terms: true });
    if (
      validateRequired(form.name, "Business name") ||
      validatePositiveNumber(form.paymentTermsDays, "Payment terms", true)
    ) {
      haptics.warning();
      return;
    }
    saveMutation.mutate();
  }, [form, saveMutation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => {
        if (editing) {
          return (
            <View style={s.headerActions}>
              <NativePressable
                haptic="light"
                onPress={cancelEdit}
                disabled={saveMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel="Cancel editing"
                style={[s.headerGhost, { borderColor: colors.border }]}
              >
                <Text style={[s.headerGhostText, { color: colors.textSecondary }]}>Cancel</Text>
              </NativePressable>
              <NativePressable
                haptic="medium"
                onPress={handleSave}
                disabled={saveMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel="Save business settings"
                style={[s.headerSave, { backgroundColor: colors.accent }]}
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator color={colors.onAccent} size="small" />
                ) : (
                  <Text style={[s.headerSaveText, { color: colors.onAccent }]}>Save</Text>
                )}
              </NativePressable>
            </View>
          );
        }
        if (business) {
          return (
            <NativePressable
              haptic="light"
              onPress={startEdit}
              accessibilityRole="button"
              accessibilityLabel="Edit business profile"
              style={[s.headerEdit, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            >
              <NativeIcon name="edit" size={15} color={colors.accentText} decorative />
              <Text style={[s.headerEditText, { color: colors.accentText }]}>Edit</Text>
            </NativePressable>
          );
        }
        return null;
      },
    });
  }, [navigation, editing, business, saveMutation.isPending, colors, startEdit, cancelEdit, handleSave]);

  function setField(field: keyof EditState, val: string) {
    setForm((prev) => (prev ? { ...prev, [field]: val } : prev));
  }

  function handleLogout() {
    haptics.warning();
    Alert.alert("Sign Out", "Are you sure you want to sign out of InvoiceFlow?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await authApi.logout();
          } catch {
            // Best-effort server logout
          }
          await logout();
        },
      },
    ]);
  }

  const initials = [user?.firstName?.charAt(0), user?.lastName?.charAt(0)]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  const nameError = touched.name && form ? validateRequired(form.name, "Business name") : undefined;
  const termsError =
    touched.terms && form
      ? validatePositiveNumber(form.paymentTermsDays, "Payment terms", true)
      : undefined;

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {businessQuery.isLoading && !business ? (
          <SettingsSkeleton />
        ) : (
          <>
            {/* Account Profile Card */}
            <Text style={[s.sectionLabel, { color: colors.textMuted }]}>ACCOUNT</Text>
            <View
              style={[
                s.profileCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={[s.avatar, { backgroundColor: colors.accentSoft }]}>
                <Text style={[s.avatarText, { color: colors.accentText }]}>
                  {initials || "IF"}
                </Text>
              </View>
              <View style={s.profileInfo}>
                <Text style={[s.profileName, { color: colors.text }]} numberOfLines={1}>
                  {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Account"}
                </Text>
                <Text style={[s.profileEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                  {user?.email ?? "Signed in"}
                </Text>
              </View>
            </View>

            {/* Appearance Theme Picker */}
            {!editing ? (
              <>
                <Text style={[s.sectionLabel, { color: colors.textMuted }]}>APPEARANCE</Text>
                <View
                  style={[
                    s.segmentWrap,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  accessibilityRole="radiogroup"
                  accessibilityLabel="App theme"
                >
                  {THEME_OPTIONS.map((opt) => {
                    const selected = preference === opt.key;
                    return (
                      <NativePressable
                        key={opt.key}
                        haptic="selection"
                        onPress={() => setPreference(opt.key)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        style={[
                          s.segmentBtn,
                          selected && {
                            backgroundColor: colors.accentSoft,
                            borderColor: colors.accent,
                          },
                        ]}
                      >
                        <NativeIcon
                          name={opt.icon}
                          size={16}
                          color={selected ? colors.accentText : colors.textSecondary}
                          decorative
                        />
                        <Text
                          style={[
                            s.segmentLabel,
                            { color: selected ? colors.accentText : colors.textSecondary },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </NativePressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {/* Business Section */}
            {businessQuery.isError ? (
              <StateView
                icon="alert"
                tone="danger"
                title="Could not load business profile"
                description="Tap below to try fetching your business settings again."
                actionLabel="Retry"
                onAction={() => businessQuery.refetch()}
              />
            ) : business ? (
              <>
                <SectionHeader icon="business" title="BUSINESS DETAILS" />
                {editing && form ? (
                  <View
                    style={[
                      s.formCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <FormField
                      label="Business Name"
                      required
                      value={form.name}
                      onChangeText={(v) => setField("name", v)}
                      onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                      error={nameError}
                      placeholder="My Business (Pty) Ltd"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => phoneRef.current?.focus()}
                    />
                    <FormField
                      ref={phoneRef}
                      label="Phone"
                      value={form.phone}
                      onChangeText={(v) => setField("phone", v)}
                      placeholder="+27 11 000 0000"
                      keyboardType="phone-pad"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => vatRef.current?.focus()}
                    />
                    <FormField
                      ref={vatRef}
                      label="VAT Number"
                      value={form.vatNumber}
                      onChangeText={(v) => setField("vatNumber", v)}
                      placeholder="4123456789"
                      keyboardType="number-pad"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => regRef.current?.focus()}
                    />
                    <FormField
                      ref={regRef}
                      label="Registration Number"
                      value={form.registrationNumber}
                      onChangeText={(v) => setField("registrationNumber", v)}
                      placeholder="2020/123456/07"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => prefixRef.current?.focus()}
                    />
                    <View style={s.twoCol}>
                      <View style={s.half}>
                        <FormField
                          ref={prefixRef}
                          label="Prefix"
                          value={form.invoicePrefix}
                          onChangeText={(v) => setField("invoicePrefix", v)}
                          placeholder="INV"
                          autoCapitalize="characters"
                          returnKeyType="next"
                          blurOnSubmit={false}
                          onSubmitEditing={() => currencyRef.current?.focus()}
                        />
                      </View>
                      <View style={s.half}>
                        <FormField
                          ref={currencyRef}
                          label="Currency"
                          value={form.currency}
                          onChangeText={(v) => setField("currency", v.toUpperCase())}
                          placeholder="ZAR"
                          autoCapitalize="characters"
                          maxLength={3}
                          returnKeyType="next"
                          blurOnSubmit={false}
                          onSubmitEditing={() => termsRef.current?.focus()}
                        />
                      </View>
                    </View>
                    <FormField
                      ref={termsRef}
                      label="Payment Terms (Days)"
                      value={form.paymentTermsDays}
                      onChangeText={(v) => setField("paymentTermsDays", v)}
                      onBlur={() => setTouched((t) => ({ ...t, terms: true }))}
                      error={termsError}
                      keyboardType="number-pad"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => streetRef.current?.focus()}
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                ) : (
                  <View
                    style={[
                      s.groupCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <InfoRow label="Name" value={business.name} />
                    {business.phone ? <InfoRow label="Phone" value={business.phone} /> : null}
                    {business.vatNumber ? <InfoRow label="VAT Number" value={business.vatNumber} /> : null}
                    {business.registrationNumber ? (
                      <InfoRow label="Reg Number" value={business.registrationNumber} />
                    ) : null}
                    <InfoRow label="Currency" value={business.currency || "ZAR"} />
                    <InfoRow label="Invoice Prefix" value={business.invoicePrefix} />
                    <InfoRow label="Payment Terms" value={`${business.paymentTermsDays} days`} last />
                  </View>
                )}

                <SectionHeader icon="location" title="ADDRESS" />
                {editing && form ? (
                  <View
                    style={[
                      s.formCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <FormField
                      ref={streetRef}
                      label="Street Address"
                      value={form.addressLine1}
                      onChangeText={(v) => setField("addressLine1", v)}
                      placeholder="123 Main Street"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => cityRef.current?.focus()}
                    />
                    <View style={s.twoCol}>
                      <View style={s.half}>
                        <FormField
                          ref={cityRef}
                          label="City"
                          value={form.city}
                          onChangeText={(v) => setField("city", v)}
                          placeholder="Johannesburg"
                          returnKeyType="next"
                          blurOnSubmit={false}
                          onSubmitEditing={() => provinceRef.current?.focus()}
                        />
                      </View>
                      <View style={s.half}>
                        <FormField
                          ref={provinceRef}
                          label="Province"
                          value={form.province}
                          onChangeText={(v) => setField("province", v)}
                          placeholder="Gauteng"
                          returnKeyType="next"
                          blurOnSubmit={false}
                          onSubmitEditing={() => postalRef.current?.focus()}
                        />
                      </View>
                    </View>
                    <FormField
                      ref={postalRef}
                      label="Postal Code"
                      value={form.postalCode}
                      onChangeText={(v) => setField("postalCode", v)}
                      placeholder="2000"
                      keyboardType="number-pad"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => bankRef.current?.focus()}
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                ) : (
                  <View
                    style={[
                      s.groupCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <InfoRow label="Street" value={business.addressLine1 || "Not set"} />
                    {business.city ? <InfoRow label="City" value={business.city} /> : null}
                    {business.province ? <InfoRow label="Province" value={business.province} /> : null}
                    <InfoRow
                      label="Postal Code"
                      value={business.postalCode || "Not set"}
                      last
                    />
                  </View>
                )}

                <SectionHeader icon="bank" title="BANKING DETAILS" />
                {editing && form ? (
                  <View
                    style={[
                      s.formCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <FormField
                      ref={bankRef}
                      label="Bank Name"
                      value={form.bankName}
                      onChangeText={(v) => setField("bankName", v)}
                      placeholder="FNB / Standard Bank / Nedbank"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => accRef.current?.focus()}
                    />
                    <FormField
                      ref={accRef}
                      label="Account Number"
                      value={form.bankAccountNumber}
                      onChangeText={(v) => setField("bankAccountNumber", v)}
                      placeholder="62000000000"
                      keyboardType="number-pad"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => branchRef.current?.focus()}
                    />
                    <FormField
                      ref={branchRef}
                      label="Branch Code"
                      value={form.bankBranchCode}
                      onChangeText={(v) => setField("bankBranchCode", v)}
                      placeholder="250655"
                      keyboardType="number-pad"
                      returnKeyType="done"
                      onSubmitEditing={handleSave}
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                ) : (
                  <View
                    style={[
                      s.groupCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <InfoRow label="Bank" value={business.bankName || "Not set"} />
                    {business.bankAccountNumber ? (
                      <InfoRow label="Account" value={business.bankAccountNumber} mono />
                    ) : null}
                    <InfoRow
                      label="Branch Code"
                      value={business.bankBranchCode || "Not set"}
                      mono
                      last
                    />
                  </View>
                )}
              </>
            ) : null}

            {/* Info note + Sign Out */}
            {!editing ? (
              <>
                <View
                  style={[
                    s.noteCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderLeftColor: colors.accent,
                    },
                  ]}
                >
                  <NativeIcon name="info" size={18} color={colors.accentText} decorative />
                  <Text style={[s.noteText, { color: colors.textSecondary }]}>
                    To upload or replace your invoice PDF logo, open InvoiceFlow on the web.
                  </Text>
                </View>

                <NativePressable
                  haptic="medium"
                  onPress={handleLogout}
                  accessibilityRole="button"
                  accessibilityLabel="Sign Out"
                  style={[
                    s.signOutBtn,
                    { backgroundColor: colors.dangerBg, borderColor: colors.danger },
                  ]}
                >
                  <NativeIcon name="sign-out" size={18} color={colors.danger} decorative />
                  <Text style={[s.signOutText, { color: colors.danger }]}>Sign Out</Text>
                </NativePressable>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SectionHeader({ icon, title }: { icon: AppIconName; title: string }) {
  const { colors } = useTheme();
  return (
    <View style={s.sectionHeaderRow}>
      <NativeIcon name={icon} size={14} color={colors.textMuted} decorative />
      <Text style={[s.sectionLabelInline, { color: colors.textMuted }]}>{title}</Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
  last,
  mono,
}: {
  label: string;
  value: string;
  last?: boolean;
  mono?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        r.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
      ]}
    >
      <Text style={[r.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text
        style={[r.value, { color: colors.text }, mono && typography.mono]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const r = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    gap: spacing.sm,
  },
  label: { ...typography.callout, flex: 1 },
  value: { ...typography.callout, fontWeight: "600", maxWidth: "60%", textAlign: "right" },
});

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginRight: spacing.md,
  },
  headerEdit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginRight: spacing.md,
    paddingHorizontal: 14,
    minHeight: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    overflow: "hidden",
  },
  headerEditText: { fontSize: 13, fontWeight: "700" },
  headerGhost: {
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerGhostText: { fontSize: 13, fontWeight: "600" },
  headerSave: {
    paddingHorizontal: 14,
    minHeight: 36,
    minWidth: 58,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerSaveText: { fontSize: 13, fontWeight: "700" },
  sectionLabel: {
    ...typography.eyebrow,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
    marginLeft: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
    marginLeft: 2,
  },
  sectionLabelInline: {
    ...typography.eyebrow,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700" },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { ...typography.headline },
  profileEmail: { ...typography.caption },
  segmentWrap: {
    flexDirection: "row",
    padding: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
    marginBottom: spacing.md,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "transparent",
    overflow: "hidden",
  },
  segmentLabel: { fontSize: 13, fontWeight: "600" },
  groupCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  formCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  twoCol: { flexDirection: "row", gap: spacing.sm },
  half: { flex: 1 },
  noteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noteText: { ...typography.caption, flex: 1, lineHeight: 19 },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minHeight: touchTarget.minHeight + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  signOutText: { ...typography.bodyStrong },
});
