"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientApi, invoiceApi, businessApi, type Client } from "@/lib/api";
import { calculateInvoiceTotals, formatCurrency, getCurrencyMeta } from "@/lib/utils/currency";

interface LineItemRow {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

const inputCls =
  "w-full px-3 py-2 text-sm border transition-colors outline-none rounded-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="block text-xs font-medium uppercase tracking-wider mb-1.5"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export default function EditInvoicePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("");
  const [tinNumber, setTinNumber] = useState("");
  const [lines, setLines] = useState<LineItemRow[]>([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients", "all"],
    queryFn: () => clientApi.list({ size: 200 }).then((r) => r.data.content),
  });

  const { data: invoice } = useQuery({
    queryKey: ["invoices", id],
    queryFn: () => invoiceApi.get(id).then((r) => r.data),
    enabled: !!id,
  });

  const { data: business } = useQuery({
    queryKey: ["business"],
    queryFn: () => businessApi.get().then((r) => r.data),
    staleTime: 60_000,
  });
  const currencyMeta = getCurrencyMeta(business?.currency ?? "ZAR");

  // Pre-fill form once invoice loads
  useEffect(() => {
    if (invoice && !loaded) {
      setClientId(invoice.client.id);
      setIssueDate(invoice.issueDate);
      setDueDate(invoice.dueDate);
      setNotes(invoice.notes ?? "");
      setTerms(invoice.terms ?? "");
      setContactPerson(invoice.contactPerson ?? "");
      setPurchaseOrderNumber(invoice.purchaseOrderNumber ?? "");
      setTinNumber(invoice.tinNumber ?? "");
      setLines(
        invoice.lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          taxRate: li.taxRate,
        }))
      );
      setLoaded(true);
    }
  }, [invoice, loaded]);

  const { mutate: update, isPending } = useMutation({
    mutationFn: () => {
      return invoiceApi.update(id, {
        clientId,
        issueDate,
        dueDate,
        lineItems: lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxRate: l.taxRate,
          amount: l.quantity * l.unitPrice * (1 + l.taxRate / 100),
        })),
        notes: notes || undefined,
        terms: terms || undefined,
        contactPerson: contactPerson || undefined,
        purchaseOrderNumber: purchaseOrderNumber || undefined,
        tinNumber: tinNumber || undefined,
      });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      router.push(`/invoices/${res.data.id}`);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? "Failed to update invoice.");
    },
  });

  function updateLine(i: number, field: keyof LineItemRow, value: string | number) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0, taxRate: 15 }]);
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  const totals = calculateInvoiceTotals(lines);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!clientId) { setError("Please select a client."); return; }
    if (lines.some((l) => !l.description)) { setError("All line items need a description."); return; }
    update();
  }

  if (!loaded) {
    return <div className="p-8 text-sm" style={{ color: "var(--text-muted)" }}>Loading invoice…</div>;
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-7">
        <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
          Invoices
        </p>
        <div className="flex items-baseline gap-4">
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "'Playfair Display', serif", color: "var(--text-primary)" }}
          >
            Edit Invoice
          </h1>
          {invoice && (
            <span className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
              {invoice.invoiceNumber}
            </span>
          )}
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider"
            style={{ background: "rgba(201,168,76,0.10)", color: "#C9A84C", letterSpacing: "0.06em" }}
          >
            {currencyMeta.flag} {currencyMeta.code}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Client & Dates */}
        <div className="p-6 mb-4" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-card)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
            Client & Dates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Client">
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={inputCls}
                style={{ background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName ?? c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Issue Date">
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className={inputCls}
                style={{ background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
              />
            </Field>
            <Field label="Due Date">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputCls}
                style={{ background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
              />
            </Field>
          </div>
        </div>

        {/* Additional Details */}
        <div className="p-6 mb-4" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-card)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
            Additional Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Contact Person">
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. John Smith"
                className={inputCls}
                style={{ background: "var(--bg-page)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
              />
            </Field>
            <Field label="Purchase Order Number">
              <input
                type="text"
                value={purchaseOrderNumber}
                onChange={(e) => setPurchaseOrderNumber(e.target.value)}
                className={inputCls}
                style={{ background: "var(--bg-page)", color: "var(--text-primary)", border: "1px solid var(--border)", fontFamily: "IBM Plex Mono" }}
              />
            </Field>
            <Field label="TIN Number">
              <input
                type="text"
                value={tinNumber}
                onChange={(e) => setTinNumber(e.target.value)}
                placeholder="Tax Identification Number"
                className={inputCls}
                style={{ background: "var(--bg-page)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
              />
            </Field>
          </div>
        </div>

        {/* Line Items */}
        <div className="p-6 mb-4" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-card)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
            Line Items
          </h2>
          <div className="grid grid-cols-[1fr_80px_110px_80px_24px] gap-2 mb-2">
            {["Description", "Qty", "Unit Price", "VAT %", ""].map((h) => (
              <p key={h} className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {h}
              </p>
            ))}
          </div>
          <div className="space-y-2">
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_110px_80px_24px] gap-2 items-center">
                <input
                  type="text"
                  value={line.description}
                  onChange={(e) => updateLine(i, "description", e.target.value)}
                  placeholder="Service or product description"
                  className={inputCls}
                  style={{ background: "var(--bg-page)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                />
                <input
                  type="number"
                  value={line.quantity}
                  min={0.01}
                  step={0.01}
                  onChange={(e) => updateLine(i, "quantity", parseFloat(e.target.value) || 0)}
                  className={inputCls + " text-right"}
                  style={{ background: "var(--bg-page)", color: "var(--text-primary)", border: "1px solid var(--border)", fontFamily: "IBM Plex Mono" }}
                />
                <input
                  type="number"
                  value={line.unitPrice}
                  min={0}
                  step={0.01}
                  onChange={(e) => updateLine(i, "unitPrice", parseFloat(e.target.value) || 0)}
                  className={inputCls + " text-right"}
                  style={{ background: "var(--bg-page)", color: "var(--text-primary)", border: "1px solid var(--border)", fontFamily: "IBM Plex Mono" }}
                />
                <input
                  type="number"
                  value={line.taxRate}
                  min={0}
                  max={100}
                  step={0.5}
                  onChange={(e) => updateLine(i, "taxRate", parseFloat(e.target.value) || 0)}
                  className={inputCls + " text-right"}
                  style={{ background: "var(--bg-page)", color: "var(--text-primary)", border: "1px solid var(--border)", fontFamily: "IBM Plex Mono" }}
                />
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  disabled={lines.length === 1}
                  className="text-center text-sm disabled:opacity-20"
                  style={{ color: "var(--status-overdue)" }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addLine}
            className="mt-3 text-xs font-medium"
            style={{ color: "var(--accent-hover)" }}
          >
            + Add line item
          </button>

          <div className="mt-5 ml-auto w-64 space-y-1.5 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
              <span>Subtotal</span>
              <span style={{ fontFamily: "IBM Plex Mono" }}>{formatCurrency(totals.subtotal, currencyMeta.code)}</span>
            </div>
            <div className="flex justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
              <span>VAT</span>
              <span style={{ fontFamily: "IBM Plex Mono" }}>{formatCurrency(totals.taxTotal, currencyMeta.code)}</span>
            </div>
            <div
              className="flex justify-between text-base font-bold border-t pt-2"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
            >
              <span>Total</span>
              <span style={{ fontFamily: "IBM Plex Mono" }}>{formatCurrency(totals.total, currencyMeta.code)}</span>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="p-6 mb-4" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-card)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
            Notes & Terms
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Notes (visible to client)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={inputCls}
                style={{ background: "var(--bg-page)", color: "var(--text-primary)", border: "1px solid var(--border)", resize: "vertical" }}
              />
            </Field>
            <Field label="Terms & Conditions">
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={3}
                className={inputCls}
                style={{ background: "var(--bg-page)", color: "var(--text-primary)", border: "1px solid var(--border)", resize: "vertical" }}
              />
            </Field>
          </div>
        </div>

        {error && (
          <p
            className="mb-4 px-4 py-2 text-sm border"
            style={{ color: "var(--status-overdue)", borderColor: "var(--status-overdue)", background: "#fef2f2" }}
          >
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 text-sm font-medium disabled:opacity-50"
            style={{ background: "#C9A84C", color: "#0A1628" }}
          >
            {isPending ? "Saving…" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/invoices/${id}`)}
            className="px-6 py-2.5 text-sm border"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
