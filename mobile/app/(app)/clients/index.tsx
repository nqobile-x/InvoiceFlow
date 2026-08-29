import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  RefreshControl, ActivityIndicator, Alert, Modal, ScrollView,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientApi, type Client } from "@/services/apiMethods";

const blankForm = (): Omit<Client, "id"> => ({
  name: "", email: "", phone: "", companyName: "", vatNumber: "",
  addressLine1: "", city: "", province: "", postalCode: "", country: "ZA", notes: "",
});

export default function ClientsScreen() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(blankForm());

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["clients", search],
    queryFn: () => clientApi.list({ search: search || undefined, size: 50 }).then((r) => r.data),
  });
  const clients = data?.content ?? [];

  const createMutation = useMutation({
    mutationFn: () => clientApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); closeModal(); },
    onError: () => Alert.alert("Error", "Could not save client."),
  });

  const updateMutation = useMutation({
    mutationFn: () => clientApi.update(editing!.id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); closeModal(); },
    onError: () => Alert.alert("Error", "Could not save client."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
    onError: () => Alert.alert("Error", "Could not delete client."),
  });

  function openCreate() {
    setEditing(null);
    setForm(blankForm());
    setModalVisible(true);
  }

  function openEdit(c: Client) {
    setEditing(c);
    setForm({ name: c.name, email: c.email ?? "", phone: c.phone ?? "",
      companyName: c.companyName ?? "", vatNumber: c.vatNumber ?? "",
      addressLine1: c.addressLine1 ?? "", city: c.city ?? "", province: c.province ?? "",
      postalCode: c.postalCode ?? "", country: c.country, notes: c.notes ?? "" });
    setModalVisible(true);
  }

  function closeModal() { setModalVisible(false); }

  function setF(field: keyof typeof form) {
    return (v: string) => setForm((f) => ({ ...f, [field]: v }));
  }

  function save() {
    if (!form.name.trim()) { Alert.alert("Required", "Client name is required."); return; }
    editing ? updateMutation.mutate() : createMutation.mutate();
  }

  function confirmDelete(c: Client) {
    Alert.alert("Delete client", `Remove ${c.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(c.id) },
    ]);
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Clients</Text>
        <TouchableOpacity style={s.addBtn} onPress={openCreate} activeOpacity={0.85}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchBar}>
        <TextInput style={s.searchInput} value={search} onChangeText={setSearch}
          placeholder="Search clients…" placeholderTextColor="#9CA3AF" />
      </View>

      {isLoading ? (
        <ActivityIndicator color="#C9A84C" style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(c) => c.id}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#C9A84C" />}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={s.empty}><Text style={s.emptyText}>No clients yet.</Text></View>
          }
          renderItem={({ item: c }) => (
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.clientName}>{c.companyName ?? c.name}</Text>
                {c.companyName && <Text style={s.clientSub}>{c.name}</Text>}
                {c.email && <Text style={s.clientSub}>{c.email}</Text>}
              </View>
              <View style={s.rowActions}>
                <TouchableOpacity onPress={() => openEdit(c)} style={s.editBtn} activeOpacity={0.7}>
                  <Text style={s.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(c)} style={s.deleteBtn} activeOpacity={0.7}>
                  <Text style={s.deleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Create/Edit modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <Text style={s.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>{editing ? "Edit Client" : "New Client"}</Text>
            <TouchableOpacity onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#C9A84C" /> : <Text style={s.modalSave}>Save</Text>}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              {[
                { label: "Full Name *", field: "name" as const, placeholder: "Jane Doe" },
                { label: "Company Name", field: "companyName" as const, placeholder: "Acme Pty Ltd" },
                { label: "Email", field: "email" as const, placeholder: "jane@acme.co.za" },
                { label: "Phone", field: "phone" as const, placeholder: "+27 11 000 0000" },
                { label: "VAT Number", field: "vatNumber" as const, placeholder: "4123456789" },
                { label: "Address", field: "addressLine1" as const, placeholder: "123 Main St" },
                { label: "City", field: "city" as const, placeholder: "Johannesburg" },
                { label: "Province", field: "province" as const, placeholder: "Gauteng" },
                { label: "Postal Code", field: "postalCode" as const, placeholder: "2000" },
              ].map(({ label, field, placeholder }) => (
                <View key={field} style={{ marginBottom: 16 }}>
                  <Text style={s.fieldLabel}>{label}</Text>
                  <TextInput style={s.fieldInput} value={String(form[field] ?? "")}
                    onChangeText={setF(field)} placeholder={placeholder} placeholderTextColor="#9CA3AF" />
                </View>
              ))}
              <View style={{ marginBottom: 16 }}>
                <Text style={s.fieldLabel}>Notes</Text>
                <TextInput style={[s.fieldInput, { height: 80, textAlignVertical: "top" }]}
                  value={form.notes ?? ""} onChangeText={setF("notes")} multiline
                  placeholder="Optional notes" placeholderTextColor="#9CA3AF" />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F6F1" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
            backgroundColor: "#0A1628", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  title: { fontSize: 22, fontWeight: "700", color: "#FFFFFF" },
  addBtn: { backgroundColor: "#C9A84C", paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { fontSize: 13, fontWeight: "700", color: "#0A1628" },
  searchBar: { backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingVertical: 10,
               borderBottomWidth: 1, borderBottomColor: "#E2DDD6" },
  searchInput: { borderWidth: 1, borderColor: "#E2DDD6", paddingHorizontal: 12, paddingVertical: 9,
                 fontSize: 14, color: "#0A1628" },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", padding: 16,
         borderBottomWidth: 1, borderBottomColor: "#E2DDD6" },
  clientName: { fontSize: 15, fontWeight: "700", color: "#0A1628", marginBottom: 2 },
  clientSub: { fontSize: 12, color: "#6B7280" },
  rowActions: { flexDirection: "row", gap: 8 },
  editBtn: { borderWidth: 1, borderColor: "#E2DDD6", paddingHorizontal: 12, paddingVertical: 6 },
  editText: { fontSize: 12, fontWeight: "600", color: "#0A1628" },
  deleteBtn: { borderWidth: 1, borderColor: "#DC2626", paddingHorizontal: 12, paddingVertical: 6 },
  deleteText: { fontSize: 12, fontWeight: "600", color: "#DC2626" },
  empty: { paddingTop: 64, alignItems: "center" },
  emptyText: { fontSize: 14, color: "#9CA3AF" },
  modal: { flex: 1, backgroundColor: "#F8F6F1" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                 backgroundColor: "#0A1628", paddingHorizontal: 20, paddingVertical: 16 },
  modalCancel: { fontSize: 14, color: "rgba(255,255,255,0.6)", width: 60 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  modalSave: { fontSize: 14, fontWeight: "700", color: "#C9A84C", width: 60, textAlign: "right" },
  fieldLabel: { fontSize: 11, fontWeight: "600", color: "#4A5568", textTransform: "uppercase",
               letterSpacing: 0.8, marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderColor: "#E2DDD6", backgroundColor: "#FFFFFF",
               paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#0A1628" },
});
