import React, { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  RefreshControl,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { clientApi, type Client } from "../../src/services/apiMethods";
import { useTheme } from "../../src/theme/ThemeProvider";
import { radius, spacing, touchTarget, typography } from "../../src/theme/tokens";
import { haptics } from "../../src/utils/haptics";
import { validateEmail, validateRequired } from "../../src/utils/validation";
import { NativeIcon } from "../../src/components/NativeIcon";
import { NativePressable } from "../../src/components/NativePressable";
import { ClientListSkeleton } from "../../src/components/Skeleton";
import { StateView } from "../../src/components/StateView";
import { BottomSheetModal } from "../../src/components/BottomSheetModal";
import { FormField } from "../../src/components/FormField";

type ClientForm = Omit<Client, "id">;

const emptyClientForm = (): ClientForm => ({
  name: "",
  companyName: "",
  email: "",
  phone: "",
  vatNumber: "",
  addressLine1: "",
  city: "",
  province: "",
  postalCode: "",
  country: "South Africa",
  notes: "",
});

export default function ClientsScreen() {
  const navigation = useNavigation();
  const qc = useQueryClient();
  const { colors } = useTheme();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyClientForm());
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean }>({});

  const companyRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);

  const openCreate = useCallback(() => {
    haptics.light();
    setEditing(null);
    setForm(emptyClientForm());
    setTouched({});
    setSheetOpen(true);
  }, []);

  const openEdit = useCallback((client: Client) => {
    haptics.light();
    setEditing(client);
    setForm({
      name: client.name,
      companyName: client.companyName ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      vatNumber: client.vatNumber ?? "",
      addressLine1: client.addressLine1 ?? "",
      city: client.city ?? "",
      province: client.province ?? "",
      postalCode: client.postalCode ?? "",
      country: client.country || "South Africa",
      notes: client.notes ?? "",
    });
    setTouched({});
    setSheetOpen(true);
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <NativePressable
          haptic="light"
          onPress={openCreate}
          accessibilityRole="button"
          accessibilityLabel="Add new client"
          style={[s.headerCta, { backgroundColor: colors.accent }]}
        >
          <NativeIcon name="plus" size={16} color={colors.onAccent} decorative />
          <Text style={[s.headerCtaText, { color: colors.onAccent }]}>Add</Text>
        </NativePressable>
      ),
    });
  }, [navigation, openCreate, colors]);

  const query = useQuery({
    queryKey: ["clients", debouncedSearch],
    queryFn: () =>
      clientApi.list({ search: debouncedSearch || undefined, size: 100 }).then((r) => r.data.content),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: ClientForm = {
        ...form,
        name: form.name.trim(),
        companyName: form.companyName?.trim() || undefined,
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        city: form.city?.trim() || undefined,
      };
      return editing ? clientApi.update(editing.id, payload) : clientApi.create(payload);
    },
    onSuccess: () => {
      haptics.success();
      qc.invalidateQueries({ queryKey: ["clients"] });
      setSheetOpen(false);
    },
    onError: () => {
      haptics.error();
      Alert.alert("Could not save client", "Please check the fields and try again.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientApi.delete(id),
    onSuccess: () => {
      haptics.success();
      qc.invalidateQueries({ queryKey: ["clients"] });
      setSheetOpen(false);
    },
    onError: () => {
      haptics.error();
      Alert.alert("Could not delete", "This client may have existing invoices.");
    },
  });

  const onRefresh = useCallback(async () => {
    haptics.light();
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  function handleSave() {
    setTouched({ name: true, email: true });
    const nameErr = validateRequired(form.name, "Contact name");
    const emailErr = form.email?.trim() ? validateEmail(form.email) : undefined;
    if (nameErr || emailErr) {
      haptics.warning();
      return;
    }
    saveMutation.mutate();
  }

  function confirmDelete(client: Client) {
    haptics.warning();
    Alert.alert("Delete Client", `Remove ${client.companyName ?? client.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(client.id),
      },
    ]);
  }

  const clients = query.data ?? [];
  const isInitialLoading = query.isLoading && !query.data;

  const renderItem = useCallback(
    ({ item }: { item: Client }) => (
      <ClientRow client={item} onPress={() => openEdit(item)} />
    ),
    [openEdit]
  );

  const nameError = touched.name ? validateRequired(form.name, "Contact name") : undefined;
  const emailError =
    touched.email && form.email?.trim() ? validateEmail(form.email) : undefined;

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* Search Bar */}
      <View style={s.searchWrap}>
        <View
          style={[
            s.searchBox,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <NativeIcon name="search" size={18} color={colors.textMuted} decorative />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search clients or companies"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search clients"
          />
          {search.length > 0 ? (
            <Pressable
              onPress={() => {
                haptics.selection();
                setSearch("");
              }}
              hitSlop={touchTarget.hitSlop}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={s.clearBtn}
            >
              <NativeIcon name="clear" size={18} color={colors.textMuted} decorative />
            </Pressable>
          ) : null}
        </View>
      </View>

      {isInitialLoading ? (
        <ClientListSkeleton />
      ) : query.isError ? (
        <StateView
          icon="alert"
          tone="danger"
          title="Could not load clients"
          description="Check your connection and try again."
          actionLabel="Retry"
          onAction={onRefresh}
        />
      ) : (
        <FlashList
          data={clients}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          ItemSeparatorComponent={ListGap}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
              progressBackgroundColor={colors.surface}
            />
          }
          ListEmptyComponent={
            <StateView
              icon="clients-outline"
              title={search ? "No matching clients" : "No clients yet"}
              description={
                search
                  ? `No clients matched "${search}".`
                  : "Add your first client to start creating invoices."
              }
              actionLabel={search ? "Clear Search" : "Add Client"}
              onAction={() => (search ? setSearch("") : openCreate())}
            />
          }
        />
      )}

      {/* Create / Edit Client Sheet */}
      <BottomSheetModal
        visible={sheetOpen}
        title={editing ? "Edit Client" : "New Client"}
        onClose={() => setSheetOpen(false)}
      >
        <ScrollView
          contentContainerStyle={s.sheetScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FormField
            label="Contact Name"
            required
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            error={nameError}
            placeholder="Thabo Mokoena"
            autoCapitalize="words"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => companyRef.current?.focus()}
          />
          <FormField
            ref={companyRef}
            label="Company Name"
            value={form.companyName ?? ""}
            onChangeText={(v) => setForm((f) => ({ ...f, companyName: v }))}
            placeholder="Bantu Pools (Pty) Ltd"
            autoCapitalize="words"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => emailRef.current?.focus()}
          />
          <FormField
            ref={emailRef}
            label="Email"
            value={form.email ?? ""}
            onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            error={emailError}
            placeholder="accounts@client.co.za"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => phoneRef.current?.focus()}
          />
          <FormField
            ref={phoneRef}
            label="Phone"
            value={form.phone ?? ""}
            onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
            placeholder="+27 11 000 0000"
            keyboardType="phone-pad"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => cityRef.current?.focus()}
          />
          <FormField
            ref={cityRef}
            label="City"
            value={form.city ?? ""}
            onChangeText={(v) => setForm((f) => ({ ...f, city: v }))}
            placeholder="Johannesburg"
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          <NativePressable
            haptic="medium"
            onPress={handleSave}
            disabled={saveMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel={editing ? "Save client changes" : "Create client"}
            style={[s.saveBtn, { backgroundColor: colors.accent }]}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={[s.saveBtnText, { color: colors.onAccent }]}>
                {editing ? "Save Changes" : "Add Client"}
              </Text>
            )}
          </NativePressable>

          {editing ? (
            <NativePressable
              haptic="medium"
              onPress={() => confirmDelete(editing)}
              disabled={deleteMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${editing.name}`}
              style={[s.deleteBtn, { borderColor: colors.danger, backgroundColor: colors.dangerBg }]}
            >
              <NativeIcon name="delete" size={18} color={colors.danger} decorative />
              <Text style={[s.deleteBtnText, { color: colors.danger }]}>Delete Client</Text>
            </NativePressable>
          ) : null}
        </ScrollView>
      </BottomSheetModal>
    </View>
  );
}

function ListGap() {
  return <View style={{ height: spacing.xs + 2 }} />;
}

const ClientRow = memo(function ClientRow({
  client,
  onPress,
}: {
  client: Client;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const title = client.companyName || client.name;
  const initials = title
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

  return (
    <NativePressable
      haptic="light"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}${client.companyName ? `, contact ${client.name}` : ""}`}
      style={[
        card.wrap,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={[card.avatar, { backgroundColor: colors.accentSoft }]}>
        <Text style={[card.avatarText, { color: colors.accentText }]}>{initials || "?"}</Text>
      </View>
      <View style={card.info}>
        <Text style={[card.name, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {client.companyName ? (
          <Text style={[card.contact, { color: colors.textSecondary }]} numberOfLines={1}>
            {client.name}
          </Text>
        ) : null}
        <View style={card.metaRow}>
          {client.email ? (
            <View style={card.metaItem}>
              <NativeIcon name="mail" size={12} color={colors.textMuted} decorative />
              <Text style={[card.metaText, { color: colors.textMuted }]} numberOfLines={1}>
                {client.email}
              </Text>
            </View>
          ) : null}
          {!client.email && client.phone ? (
            <View style={card.metaItem}>
              <NativeIcon name="phone" size={12} color={colors.textMuted} decorative />
              <Text style={[card.metaText, { color: colors.textMuted }]} numberOfLines={1}>
                {client.phone}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <NativeIcon name="chevron-right" size={20} color={colors.textMuted} decorative />
    </NativePressable>
  );
});

const s = StyleSheet.create({
  root: { flex: 1 },
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
  searchWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingLeft: spacing.sm + 2,
    paddingRight: spacing.xs,
    minHeight: touchTarget.minHeight,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
  },
  clearBtn: {
    minWidth: touchTarget.minWidth,
    minHeight: touchTarget.minHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  sheetScroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  saveBtn: {
    minHeight: touchTarget.minHeight + 2,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
    overflow: "hidden",
  },
  saveBtnText: {
    ...typography.headline,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minHeight: touchTarget.minHeight,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  deleteBtnText: {
    ...typography.bodyStrong,
  },
});

const card = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.bodyStrong,
  },
  contact: {
    ...typography.caption,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
});
