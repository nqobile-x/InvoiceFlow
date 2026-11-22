import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  FlatList,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { businessApi, clientApi, invoiceApi, type Client } from "../../src/services/apiMethods";
import { useTheme } from "../../src/theme/ThemeProvider";
import { radius, spacing, touchTarget, typography } from "../../src/theme/tokens";
import { formatCurrency } from "../../src/utils/currency";
import { haptics } from "../../src/utils/haptics";
import {
  calculateInvoiceTotals,
  validateIsoDate,
  validatePositiveNumber,
  validateRequired,
  type LineItemDraft,
} from "../../src/utils/validation";
import { NativeIcon } from "../../src/components/NativeIcon";
import { NativePressable } from "../../src/components/NativePressable";
import { FormField } from "../../src/components/FormField";
import { BottomSheetModal } from "../../src/components/BottomSheetModal";

let lineSeq = 1;
const createEmptyLine = (): LineItemDraft => ({
  id: `line-${lineSeq++}`,
  description: "",
  quantity: "1",
  unitPrice: "",
  taxRate: "15",
});

function dateOffsetStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const TERMS_PRESETS = [
  { label: "Due on receipt", days: 0 },
  { label: "Net 7", days: 7 },
  { label: "Net 14", days: 14 },
  { label: "Net 30", days: 30 },
];

export default function NewInvoiceScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const dueDateRef = useRef<TextInput>(null);
  const [clientId, setClientId] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [issueDate, setIssueDate] = useState(() => dateOffsetStr(0));
  const [dueDate, setDueDate] = useState(() => dateOffsetStr(30));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItemDraft[]>(() => [createEmptyLine()]);
  const [submitted, setSubmitted] = useState(false);

  const { data: clients = [], isLoading: loadingClients } = useQuery<Client[]>({
    queryKey: ["clients", "all"],
    queryFn: () => clientApi.list({ size: 200 }).then((r) => r.data.content),
  });

  const { data: business } = useQuery({
    queryKey: ["business"],
    queryFn: () => businessApi.get().then((r) => r.data),
  });
  const currency = business?.currency ?? "ZAR";

  const selectedClient = clients.find((c) => c.id === clientId);
  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.companyName?.toLowerCase().includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false)
    );
  }, [clients, clientQuery]);

  const totals = useMemo(() => calculateInvoiceTotals(lines), [lines]);

  const createMutation = useMutation({
    mutationFn: () =>
      invoiceApi.create({
        clientId,
        issueDate: issueDate.trim(),
        dueDate: dueDate.trim(),
        lineItems: lines.map((l) => {
          const qty = parseFloat(l.quantity) || 1;
          const unitPrice = parseFloat(l.unitPrice) || 0;
          const taxRate = parseFloat(l.taxRate) || 0;
          return {
            description: l.description.trim(),
            quantity: qty,
            unitPrice,
            taxRate,
            amount: qty * unitPrice * (1 + taxRate / 100),
          };
        }),
        notes: notes.trim() || undefined,
      }),
    onSuccess: (res) => {
      haptics.success();
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      qc.invalidateQueries({ queryKey: ["dashboard-recent"] });
      router.replace(`/invoices/${res.data.id}`);
    },
    onError: () => {
      haptics.error();
      Alert.alert("Could not create invoice", "Please verify your details and try again.");
    },
  });

  const issueErr = submitted ? validateIsoDate(issueDate, "Issue date") : undefined;
  const dueErr = submitted ? validateIsoDate(dueDate, "Due date") : undefined;
  const clientErr = submitted && !clientId ? "Select a client for this invoice." : undefined;

  const submit = useCallback(() => {
    setSubmitted(true);
    const hasClientErr = !clientId;
    const hasDateErr =
      !!validateIsoDate(issueDate, "Issue date") || !!validateIsoDate(dueDate, "Due date");
    const hasLineErr = lines.some(
      (l) =>
        !!validateRequired(l.description, "Description") ||
        !!validatePositiveNumber(l.quantity, "Quantity") ||
        !!validatePositiveNumber(l.unitPrice, "Unit price", true)
    );

    if (hasClientErr || hasDateErr || hasLineErr) {
      haptics.warning();
      return;
    }
    createMutation.mutate();
  }, [clientId, issueDate, dueDate, lines, createMutation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <NativePressable
          haptic="light"
          disableScale
          onPress={() => router.back()}
          hitSlop={touchTarget.hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Cancel new invoice"
          style={s.headerSideBtn}
        >
          <Text style={[s.headerCancel, { color: colors.textSecondary }]}>Cancel</Text>
        </NativePressable>
      ),
      headerRight: () => (
        <NativePressable
          haptic="medium"
          onPress={submit}
          disabled={createMutation.isPending}
          hitSlop={touchTarget.hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Create invoice"
          style={[s.headerCreateBtn, { backgroundColor: colors.accent }]}
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.onAccent} />
          ) : (
            <Text style={[s.headerCreateText, { color: colors.onAccent }]}>Create</Text>
          )}
        </NativePressable>
      ),
    });
  }, [navigation, router, submit, createMutation.isPending, colors]);

  function updateLine(id: string, field: keyof Omit<LineItemDraft, "id">, val: string) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: val } : l)));
  }

  function addLine() {
    haptics.light();
    setLines((prev) => [...prev, createEmptyLine()]);
  }

  function removeLine(id: string) {
    haptics.light();
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingBottom: Math.max(insets.bottom + 32, 48) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Client Picker Trigger */}
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>CLIENT *</Text>
        <NativePressable
          haptic="light"
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={
            selectedClient
              ? `Client: ${selectedClient.companyName ?? selectedClient.name}. Tap to change.`
              : "Select a client"
          }
          style={[
            s.pickerTrigger,
            {
              backgroundColor: colors.surface,
              borderColor: clientErr ? colors.danger : colors.border,
              borderWidth: clientErr ? 1.5 : 1,
            },
          ]}
        >
          <View style={s.pickerLeft}>
            <View style={[s.pickerAvatar, { backgroundColor: colors.accentSoft }]}>
              <NativeIcon name="clients" size={18} color={colors.accentText} decorative />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  s.pickerValue,
                  { color: selectedClient ? colors.text : colors.textMuted },
                ]}
                numberOfLines={1}
              >
                {selectedClient
                  ? selectedClient.companyName ?? selectedClient.name
                  : "Select client…"}
              </Text>
              {selectedClient?.email ? (
                <Text style={[s.pickerSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {selectedClient.email}
                </Text>
              ) : null}
            </View>
          </View>
          <NativeIcon name="chevron-down" size={20} color={colors.textMuted} decorative />
        </NativePressable>
        {clientErr ? (
          <Text style={[s.inlineErr, { color: colors.danger }]}>{clientErr}</Text>
        ) : null}

        {/* Dates + Presets */}
        <Text style={[s.sectionLabel, { color: colors.textMuted, marginTop: spacing.md }]}>
          DATES
        </Text>
        <View
          style={[
            s.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={s.twoCol}>
            <View style={s.half}>
              <FormField
                label="Issue Date"
                required
                value={issueDate}
                onChangeText={setIssueDate}
                error={issueErr}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => dueDateRef.current?.focus()}
              />
            </View>
            <View style={s.half}>
              <FormField
                ref={dueDateRef}
                label="Due Date"
                required
                value={dueDate}
                onChangeText={setDueDate}
                error={dueErr}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
                returnKeyType="done"
              />
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.presetRow}
          >
            {TERMS_PRESETS.map((p) => {
              const target = dateOffsetStr(p.days);
              const active = dueDate === target;
              return (
                <NativePressable
                  key={p.label}
                  haptic="selection"
                  onPress={() => setDueDate(target)}
                  style={[
                    s.presetChip,
                    {
                      backgroundColor: active ? colors.accentSoft : colors.surfaceElevated,
                      borderColor: active ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.presetText,
                      { color: active ? colors.accentText : colors.textSecondary },
                    ]}
                  >
                    {p.label}
                  </Text>
                </NativePressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Line Items */}
        <View style={s.sectionRow}>
          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>LINE ITEMS</Text>
          <Text style={[s.lineCount, { color: colors.textMuted }]}>
            {lines.length} {lines.length === 1 ? "item" : "items"}
          </Text>
        </View>

        {lines.map((line, idx) => {
          const qty = parseFloat(line.quantity) || 0;
          const price = parseFloat(line.unitPrice) || 0;
          const vat = parseFloat(line.taxRate) || 0;
          const lineTotal = qty * price * (1 + vat / 100);
          const descErr = submitted ? validateRequired(line.description, "Description") : undefined;
          const priceErr = submitted
            ? validatePositiveNumber(line.unitPrice, "Unit price", true)
            : undefined;

          return (
            <View
              key={line.id}
              style={[
                s.lineCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={s.lineHeader}>
                <Text style={[s.lineIdx, { color: colors.textMuted }]}>ITEM {idx + 1}</Text>
                <View style={s.lineHeaderRight}>
                  <Text style={[s.lineAmt, { color: colors.text }]}>
                    {formatCurrency(lineTotal, currency)}
                  </Text>
                  {lines.length > 1 ? (
                    <Pressable
                      onPress={() => removeLine(line.id)}
                      hitSlop={touchTarget.hitSlop}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove line item ${idx + 1}`}
                      style={[s.removeBtn, { backgroundColor: colors.dangerBg }]}
                    >
                      <NativeIcon name="delete" size={16} color={colors.danger} decorative />
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <FormField
                label="Description"
                required
                value={line.description}
                onChangeText={(v) => updateLine(line.id, "description", v)}
                error={descErr}
                placeholder="Web design, consulting, etc."
                returnKeyType="next"
              />

              <View style={s.threeCol}>
                <View style={s.third}>
                  <FormField
                    label="Qty"
                    value={line.quantity}
                    onChangeText={(v) => updateLine(line.id, "quantity", v)}
                    keyboardType="decimal-pad"
                    style={s.numInput}
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
                <View style={s.third}>
                  <FormField
                    label="Unit Price"
                    value={line.unitPrice}
                    onChangeText={(v) => updateLine(line.id, "unitPrice", v)}
                    error={priceErr}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    style={s.numInput}
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
                <View style={s.third}>
                  <FormField
                    label="VAT %"
                    value={line.taxRate}
                    onChangeText={(v) => updateLine(line.id, "taxRate", v)}
                    keyboardType="decimal-pad"
                    style={s.numInput}
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              </View>
            </View>
          );
        })}

        <NativePressable
          haptic="light"
          onPress={addLine}
          accessibilityRole="button"
          accessibilityLabel="Add line item"
          style={[
            s.addLineBtn,
            { backgroundColor: colors.surface, borderColor: colors.accent },
          ]}
        >
          <NativeIcon name="plus" size={18} color={colors.accentText} decorative />
          <Text style={[s.addLineText, { color: colors.accentText }]}>Add Line Item</Text>
        </NativePressable>

        {/* Live Totals Card */}
        <View
          style={[
            s.totalsCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={s.totalRow}>
            <Text style={[s.totalLabel, { color: colors.textSecondary }]}>Subtotal</Text>
            <Text style={[s.totalValue, { color: colors.text }]}>
              {formatCurrency(totals.subtotal, currency)}
            </Text>
          </View>
          <View style={s.totalRow}>
            <Text style={[s.totalLabel, { color: colors.textSecondary }]}>VAT</Text>
            <Text style={[s.totalValue, { color: colors.text }]}>
              {formatCurrency(totals.tax, currency)}
            </Text>
          </View>
          <View style={[s.grandRow, { borderTopColor: colors.border }]}>
            <Text style={[s.grandLabel, { color: colors.accentText }]}>TOTAL</Text>
            <Text style={[s.grandValue, { color: colors.accentText }]}>
              {formatCurrency(totals.total, currency)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        <View
          style={[
            s.card,
            { backgroundColor: colors.surface, borderColor: colors.border, marginTop: spacing.md },
          ]}
        >
          <FormField
            label="Notes (Optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Payment instructions or thank you note"
            multiline
            containerStyle={{ marginBottom: 0 }}
          />
        </View>

        <NativePressable
          haptic="medium"
          onPress={submit}
          disabled={createMutation.isPending}
          accessibilityRole="button"
          accessibilityLabel="Create Invoice"
          style={[s.submitBtn, { backgroundColor: colors.accent }]}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={[s.submitText, { color: colors.onAccent }]}>Create Invoice</Text>
          )}
        </NativePressable>
      </ScrollView>

      {/* Searchable Native Bottom Sheet Client Picker */}
      <BottomSheetModal
        visible={pickerOpen}
        title="Select Client"
        onClose={() => setPickerOpen(false)}
      >
        <View style={s.sheetSearchWrap}>
          <View
            style={[
              s.sheetSearchBox,
              { backgroundColor: colors.inputBg, borderColor: colors.border },
            ]}
          >
            <NativeIcon name="search" size={18} color={colors.textMuted} decorative />
            <TextInput
              style={[s.sheetSearchInput, { color: colors.text }]}
              value={clientQuery}
              onChangeText={setClientQuery}
              placeholder="Filter clients…"
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
            />
          </View>
        </View>

        {loadingClients ? (
          <View style={s.sheetEmpty}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={filteredClients}
            keyExtractor={(c) => c.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.sheetList}
            ListEmptyComponent={
              <View style={s.sheetEmpty}>
                <Text style={[s.sheetEmptyText, { color: colors.textSecondary }]}>
                  No clients found. Add a client in the Clients tab first.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const selected = item.id === clientId;
              return (
                <NativePressable
                  haptic="selection"
                  onPress={() => {
                    setClientId(item.id);
                    setPickerOpen(false);
                    setClientQuery("");
                  }}
                  style={[
                    s.clientOption,
                    {
                      backgroundColor: selected ? colors.accentSoft : "transparent",
                      borderBottomColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        s.clientOptionName,
                        { color: selected ? colors.accentText : colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {item.companyName ?? item.name}
                    </Text>
                    {item.companyName ? (
                      <Text style={[s.clientOptionSub, { color: colors.textSecondary }]}>
                        {item.name}
                      </Text>
                    ) : null}
                  </View>
                  {selected ? (
                    <NativeIcon name="check-circle" size={20} color={colors.accentText} decorative />
                  ) : null}
                </NativePressable>
              );
            }}
          />
        )}
      </BottomSheetModal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: spacing.md,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  headerSideBtn: {
    minHeight: 40,
    justifyContent: "center",
    paddingRight: spacing.xs,
  },
  headerCancel: { fontSize: 15, fontWeight: "500" },
  headerCreateBtn: {
    paddingHorizontal: 14,
    minHeight: 34,
    minWidth: 66,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerCreateText: { fontSize: 14, fontWeight: "700" },
  sectionLabel: { ...typography.eyebrow, marginBottom: spacing.xs, marginLeft: 2 },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  lineCount: { ...typography.caption },
  pickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    minHeight: 58,
    overflow: "hidden",
  },
  pickerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  pickerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerValue: { ...typography.bodyStrong },
  pickerSub: { ...typography.caption },
  inlineErr: { ...typography.caption, fontWeight: "500", marginTop: 6, marginLeft: 2 },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  twoCol: { flexDirection: "row", gap: spacing.sm },
  half: { flex: 1 },
  presetRow: { gap: spacing.xs, paddingTop: 2 },
  presetChip: {
    paddingHorizontal: 12,
    minHeight: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  presetText: { fontSize: 12, fontWeight: "600" },
  lineCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  lineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  lineIdx: { ...typography.eyebrow },
  lineHeaderRight: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  lineAmt: { ...typography.callout, ...typography.mono, fontWeight: "700" },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  threeCol: { flexDirection: "row", gap: spacing.xs },
  third: { flex: 1 },
  numInput: { textAlign: "right", ...typography.mono },
  addLineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minHeight: touchTarget.minHeight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  addLineText: { ...typography.bodyStrong },
  totalsCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  totalLabel: { ...typography.callout },
  totalValue: { ...typography.callout, ...typography.mono, fontWeight: "500" },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  grandLabel: { ...typography.callout, fontWeight: "700" },
  grandValue: { fontSize: 20, fontWeight: "700", ...typography.mono },
  submitBtn: {
    minHeight: touchTarget.minHeight + 4,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
    overflow: "hidden",
  },
  submitText: { ...typography.headline },
  sheetSearchWrap: { padding: spacing.md, paddingBottom: spacing.xs },
  sheetSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    minHeight: touchTarget.minHeight,
  },
  sheetSearchInput: { flex: 1, fontSize: 15, paddingVertical: 8 },
  sheetList: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  sheetEmpty: { padding: spacing.xl, alignItems: "center" },
  sheetEmptyText: { ...typography.callout, textAlign: "center" },
  clientOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    gap: spacing.sm,
  },
  clientOptionName: { ...typography.bodyStrong },
  clientOptionSub: { ...typography.caption, marginTop: 2 },
});
