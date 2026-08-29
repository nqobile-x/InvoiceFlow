"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientApi, type Client, type CreateClientRequest } from "@/lib/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required").or(z.literal("")),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  vatNumber: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default("ZA"),
  notes: z.string().optional(),
});
type Form = z.infer<typeof schema>;

const inputCls =
  "w-full px-3 py-2 text-sm border rounded-none outline-none transition-colors";

const IS = {
  background: "var(--bg-page)",
  color: "var(--text-primary)",
  border: "1px solid var(--border)",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default function ClientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["clients", search, page],
    queryFn: () => clientApi.list({ search: search || undefined, page, size: 20 }).then((r) => r.data),
  });

  const clients: Client[] = data?.content ?? [];

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  function openCreate() {
    reset({});
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(c: Client) {
    reset({
      name: c.name,
      email: c.email ?? "",
      phone: c.phone ?? "",
      companyName: c.companyName ?? "",
      vatNumber: c.vatNumber ?? "",
      addressLine1: c.addressLine1 ?? "",
      city: c.city ?? "",
      province: c.province ?? "",
      postalCode: c.postalCode ?? "",
      country: c.country ?? "ZA",
      notes: c.notes ?? "",
    });
    setEditing(c);
    setShowForm(true);
  }

  const { mutate: save } = useMutation({
    mutationFn: (data: Form) => {
      const payload: CreateClientRequest = {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        companyName: data.companyName || undefined,
        vatNumber: data.vatNumber || undefined,
        addressLine1: data.addressLine1 || undefined,
        city: data.city || undefined,
        province: data.province || undefined,
        postalCode: data.postalCode || undefined,
        country: data.country || "ZA",
        notes: data.notes || undefined,
      };
      return editing
        ? clientApi.update(editing.id, payload)
        : clientApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      setShowForm(false);
      setToastMsg(editing ? "Client updated." : "Client created.");
    },
  });

  const { mutate: deleteClient } = useMutation({
    mutationFn: (id: string) => clientApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      setToastMsg("Client removed.");
    },
  });

  return (
    <div className="p-8">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 px-4 py-3 text-sm font-medium shadow-lg z-50"
          style={{ background: "var(--bg-sidebar)", color: "#C9A84C" }}>
          {toastMsg}
          <button className="ml-4 opacity-60 hover:opacity-100" onClick={() => setToastMsg("")}>✕</button>
        </div>
      )}

      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Manage</p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "var(--text-primary)" }}>
            Clients
          </h1>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 text-sm font-medium"
          style={{ background: "#C9A84C", color: "#0A1628" }}
        >
          + Add Client
        </button>
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search by name, company, or email…"
          className="w-full max-w-xs px-3 py-2 text-sm border rounded-none outline-none"
          style={{ background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
        />
      </div>

      {/* Table */}
      <div style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-card)" }}>
        {isLoading ? (
          <div className="py-16 text-center text-sm" style={{ color: "var(--text-muted)" }}>Loading…</div>
        ) : clients.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No clients yet.</p>
            <button onClick={openCreate} className="mt-3 px-4 py-2 text-sm font-medium" style={{ background: "#C9A84C", color: "#0A1628" }}>
              Add first client
            </button>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  {["Name", "Company", "Email", "City", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-black/[0.02] transition-colors" style={{ borderColor: "var(--border)" }}>
                    <td className="px-5 py-3 text-sm font-medium" style={{ color: "var(--text-primary)" }}>{c.name}</td>
                    <td className="px-5 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{c.companyName ?? "—"}</td>
                    <td className="px-5 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{c.email ?? "—"}</td>
                    <td className="px-5 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{c.city ?? "—"}</td>
                    <td className="px-5 py-3 text-right flex gap-3 justify-end">
                      <button onClick={() => openEdit(c)} className="text-xs font-medium" style={{ color: "var(--accent-hover)" }}>Edit</button>
                      <button onClick={() => { if (confirm(`Remove ${c.name}?`)) deleteClient(c.id); }} className="text-xs font-medium" style={{ color: "var(--status-overdue)" }}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(data?.totalPages ?? 0) > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Page {page + 1} of {data?.totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 text-xs border disabled:opacity-40" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>Previous</button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= (data?.totalPages ?? 0)} className="px-3 py-1 text-xs border disabled:opacity-40" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Slide-over form */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowForm(false)} />
          <aside className="fixed inset-y-0 right-0 w-[480px] z-50 flex flex-col shadow-2xl" style={{ background: "var(--bg-surface)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-base font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: "var(--text-primary)" }}>
                {editing ? "Edit Client" : "New Client"}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ color: "var(--text-muted)" }}>✕</button>
            </div>
            <form onSubmit={handleSubmit((d) => save(d))} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Full Name *">
                  <input {...register("name")} className={inputCls} style={IS} />
                  {errors.name && <p className="mt-1 text-xs" style={{ color: "var(--status-overdue)" }}>{errors.name.message}</p>}
                </Field>
                <Field label="Company">
                  <input {...register("companyName")} className={inputCls} style={IS} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Email">
                  <input {...register("email")} type="email" className={inputCls} style={IS} />
                  {errors.email && <p className="mt-1 text-xs" style={{ color: "var(--status-overdue)" }}>{errors.email.message}</p>}
                </Field>
                <Field label="Phone">
                  <input {...register("phone")} className={inputCls} style={IS} />
                </Field>
              </div>
              <Field label="VAT Number">
                <input {...register("vatNumber")} className={inputCls} style={IS} />
              </Field>
              <Field label="Street Address">
                <input {...register("addressLine1")} className={inputCls} style={IS} />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="City">
                  <input {...register("city")} className={inputCls} style={IS} />
                </Field>
                <Field label="Province">
                  <input {...register("province")} className={inputCls} style={IS} />
                </Field>
                <Field label="Postal Code">
                  <input {...register("postalCode")} className={inputCls} style={IS} />
                </Field>
              </div>
              <Field label="Notes">
                <textarea {...register("notes")} rows={3} className={inputCls} style={{ ...IS, resize: "vertical" }} />
              </Field>
            </form>
            <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={handleSubmit((d) => save(d))}
                disabled={isSubmitting}
                className="flex-1 py-2.5 text-sm font-medium disabled:opacity-50"
                style={{ background: "#C9A84C", color: "#0A1628" }}
              >
                {isSubmitting ? "Saving…" : editing ? "Save Changes" : "Add Client"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm border" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                Cancel
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
