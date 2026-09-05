"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoiceApi, type Invoice } from "@/lib/api";
import { formatCurrency } from "@/lib/utils/currency";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#6B7280", SENT: "#2563EB", VIEWED: "#7C3AED",
  PAID: "#059669", OVERDUE: "#DC2626", CANCELLED: "#9CA3AF",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="inline-flex items-center px-3 py-1 text-xs font-medium uppercase tracking-wider"
      style={{ background: STATUS_COLORS[status] + "18", color: STATUS_COLORS[status] }}
    >
      {status}
    </span>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [sending, setSending] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const { data: inv, isLoading } = useQuery<Invoice>({
    queryKey: ["invoice", id],
    queryFn: () => invoiceApi.get(id).then((r) => r.data),
  });

  const { mutate: sendInvoice } = useMutation({
    mutationFn: () => invoiceApi.send(id),
    onMutate: () => setSending(true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setToastMsg("Invoice sent successfully.");
      setSending(false);
    },
    onError: () => {
      setToastMsg("Failed to send invoice.");
      setSending(false);
    },
  });

  const { mutate: downloadPdf } = useMutation({
    mutationFn: () => invoiceApi.downloadPdf(id),
    onSuccess: (res) => {
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${inv?.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  const { mutate: markPaid } = useMutation({
    mutationFn: () =>
      invoiceApi.markPaid(id, {
        amount: inv!.total,
        paymentMethod: "BANK_TRANSFER",
        reference: `Manual-${inv!.invoiceNumber}`,
        paidAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setToastMsg("Invoice marked as paid.");
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 text-sm" style={{ color: "var(--text-muted)" }}>
        Loading…
      </div>
    );
  }

  if (!inv) {
    return (
      <div className="p-8 text-sm" style={{ color: "var(--text-muted)" }}>
        Invoice not found.
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Toast */}
      {toastMsg && (
        <div
          className="fixed top-4 right-4 px-4 py-3 text-sm font-medium shadow-lg z-50"
          style={{ background: "var(--bg-sidebar)", color: "#C9A84C" }}
        >
          {toastMsg}
          <button className="ml-4 opacity-60 hover:opacity-100" onClick={() => setToastMsg("")}>✕</button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/invoices")}
            className="text-xs mb-2 flex items-center gap-1"
            style={{ color: "var(--text-muted)" }}
          >
            ← All invoices
          </button>
          <div className="flex items-center gap-3">
            <h1
              className="text-3xl font-bold"
              style={{ fontFamily: "'Playfair Display', serif", color: "var(--text-primary)" }}
            >
              {inv.invoiceNumber}
            </h1>
            <StatusBadge status={inv.status} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => downloadPdf()}
            className="px-3 py-2 text-xs font-medium border"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            Download PDF
          </button>
          {(inv.status === "DRAFT" || inv.status === "OVERDUE") && (
            <button
              onClick={() => sendInvoice()}
              disabled={sending}
              className="px-3 py-2 text-xs font-medium disabled:opacity-50"
              style={{ background: "#2563EB", color: "#fff" }}
            >
              {sending ? "Sending…" : "Send Invoice"}
            </button>
          )}
          {(inv.status === "SENT" || inv.status === "VIEWED" || inv.status === "OVERDUE") && (
            <button
              onClick={() => markPaid()}
              className="px-3 py-2 text-xs font-medium"
              style={{ background: "#059669", color: "#fff" }}
            >
              Mark Paid
            </button>
          )}
        </div>
      </div>

      {/* Invoice body */}
      <div style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-card)" }}>
        {/* Meta */}
        <div className="grid grid-cols-3 gap-6 p-6 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
              Bill To
            </p>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {inv.client.companyName ?? inv.client.name}
            </p>
            {inv.client.companyName && (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{inv.client.name}</p>
            )}
            {inv.client.email && (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{inv.client.email}</p>
            )}
            {inv.client.city && (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {inv.client.city}{inv.client.province ? `, ${inv.client.province}` : ""}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Issue Date</p>
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>{inv.issueDate}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Due Date</p>
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>{inv.dueDate}</p>
            </div>
            {inv.contactPerson && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Contact Person</p>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>{inv.contactPerson}</p>
              </div>
            )}
            {inv.purchaseOrderNumber && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>PO Number</p>
                <p className="text-sm tabular" style={{ fontFamily: "IBM Plex Mono", color: "var(--text-primary)" }}>{inv.purchaseOrderNumber}</p>
              </div>
            )}
            {inv.tinNumber && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>TIN Number</p>
                <p className="text-sm tabular" style={{ fontFamily: "IBM Plex Mono", color: "var(--text-primary)" }}>{inv.tinNumber}</p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {inv.sentAt && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Sent</p>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {new Date(inv.sentAt).toLocaleDateString("en-ZA")}
                </p>
              </div>
            )}
            {inv.paidAt && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Paid</p>
                <p className="text-sm font-medium" style={{ color: "#059669" }}>
                  {new Date(inv.paidAt).toLocaleDateString("en-ZA")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Line items */}
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)", background: "var(--bg-page)" }}>
              {["Description", "Qty", "Unit Price", "VAT", "Amount"].map((h) => (
                <th
                  key={h}
                  className={`px-6 py-3 text-xs font-medium uppercase tracking-wider ${h !== "Description" ? "text-right" : "text-left"}`}
                  style={{ color: "var(--text-muted)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inv.lineItems.map((item, i) => (
              <tr key={i} className="border-b" style={{ borderColor: "var(--border)" }}>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                  {item.description}
                </td>
                <td className="px-6 py-3 text-sm text-right tabular" style={{ fontFamily: "IBM Plex Mono", color: "var(--text-secondary)" }}>
                  {item.quantity}
                </td>
                <td className="px-6 py-3 text-sm text-right tabular" style={{ fontFamily: "IBM Plex Mono", color: "var(--text-secondary)" }}>
                  {formatCurrency(item.unitPrice, inv.currency)}
                </td>
                <td className="px-6 py-3 text-sm text-right tabular" style={{ fontFamily: "IBM Plex Mono", color: "var(--text-secondary)" }}>
                  {item.taxRate}%
                </td>
                <td className="px-6 py-3 text-sm text-right font-medium tabular" style={{ fontFamily: "IBM Plex Mono", color: "var(--text-primary)" }}>
                  {formatCurrency(item.amount, inv.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end p-6">
          <div className="w-56 space-y-2">
            <div className="flex justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
              <span>Subtotal</span>
              <span className="tabular" style={{ fontFamily: "IBM Plex Mono" }}>{formatCurrency(inv.subtotal, inv.currency)}</span>
            </div>
            <div className="flex justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
              <span>VAT</span>
              <span className="tabular" style={{ fontFamily: "IBM Plex Mono" }}>{formatCurrency(inv.taxTotal, inv.currency)}</span>
            </div>
            <div
              className="flex justify-between text-base font-bold border-t pt-2"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
            >
              <span>Total</span>
              <span className="tabular" style={{ fontFamily: "IBM Plex Mono" }}>{formatCurrency(inv.total, inv.currency)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {(inv.notes || inv.terms) && (
          <div className="px-6 pb-6 grid grid-cols-2 gap-6 border-t" style={{ borderColor: "var(--border)", paddingTop: "1.25rem" }}>
            {inv.notes && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Notes</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{inv.notes}</p>
              </div>
            )}
            {inv.terms && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Terms</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{inv.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Public link */}
      {inv.viewToken && (
        <div className="mt-4 px-4 py-3 flex items-center gap-3 border" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Client link:</p>
          <code
            className="text-xs flex-1 truncate"
            style={{ fontFamily: "IBM Plex Mono", color: "var(--text-secondary)" }}
          >
            {typeof window !== "undefined" ? window.location.origin : ""}/invoice/{inv.viewToken}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/invoice/${inv.viewToken}`)}
            className="text-xs font-medium shrink-0"
            style={{ color: "var(--accent-hover)" }}
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}
