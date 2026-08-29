"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils/currency";
import type { Invoice } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#6B7280", SENT: "#2563EB", VIEWED: "#7C3AED",
  PAID: "#059669", OVERDUE: "#DC2626", CANCELLED: "#9CA3AF",
};

export default function PublicInvoicePage() {
  const { viewToken } = useParams<{ viewToken: string }>();

  const { data: inv, isLoading, isError } = useQuery<Invoice>({
    queryKey: ["public-invoice", viewToken],
    queryFn: () => api.get<Invoice>(`/invoices/public/${viewToken}`).then((r) => r.data),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading invoice…</p>
      </div>
    );
  }

  if (isError || !inv) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <div className="text-center">
          <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Invoice not found</p>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            This link may have expired or the invoice no longer exists.
          </p>
        </div>
      </div>
    );
  }

  const primaryColor = inv.business?.primaryColor ?? "#0A1628";
  const businessLogoUrl = inv.business?.logoUrl;
  const businessName = inv.business?.name;

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "var(--bg-page)" }}>
      <div className="max-w-2xl mx-auto">
        {/* Invoice document */}
        <div style={{ background: "#fff", boxShadow: "0 2px 16px rgba(0,0,0,0.1)" }}>
          {/* Header stripe */}
          <div className="px-10 py-6" style={{ background: primaryColor }}>
            <div className="flex items-end justify-between">
              <div>
                {businessLogoUrl && (
                  <img
                    src={businessLogoUrl}
                    alt={businessName ?? "Business logo"}
                    className="mb-2 object-contain"
                    style={{ maxHeight: 56, maxWidth: 160 }}
                  />
                )}
                <p
                  className="text-xl font-bold"
                  style={{ fontFamily: "'Playfair Display', serif", color: "#C9A84C" }}
                >
                  {businessName ?? inv.client?.companyName ?? "Invoice"}
                </p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                  INVOICE
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold" style={{ fontFamily: "'IBM Plex Mono'", color: "#fff" }}>
                  {inv.invoiceNumber}
                </p>
                <span
                  className="inline-block mt-1 px-2 py-0.5 text-xs font-medium uppercase tracking-wider"
                  style={{
                    background: STATUS_COLORS[inv.status] + "30",
                    color: STATUS_COLORS[inv.status] === "#PAID" ? "#059669" : "#fff",
                    border: `1px solid ${STATUS_COLORS[inv.status]}50`,
                  }}
                >
                  {inv.status}
                </span>
              </div>
            </div>
          </div>

          <div className="px-10 py-8">
            {/* Bill to + dates */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>
                  Bill To
                </p>
                <p className="font-semibold" style={{ color: "#0A1628" }}>
                  {inv.client?.companyName ?? inv.client?.name}
                </p>
                {inv.client?.companyName && (
                  <p className="text-sm" style={{ color: "#4A5568" }}>{inv.client.name}</p>
                )}
                {inv.client?.email && (
                  <p className="text-sm" style={{ color: "#4A5568" }}>{inv.client.email}</p>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#9CA3AF" }}>
                    Issue Date
                  </p>
                  <p className="text-sm" style={{ color: "#0A1628" }}>{inv.issueDate}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#9CA3AF" }}>
                    Due Date
                  </p>
                  <p
                    className="text-sm font-medium"
                    style={{ color: inv.status === "OVERDUE" ? "#DC2626" : "#0A1628" }}
                  >
                    {inv.dueDate}
                  </p>
                </div>
              </div>
            </div>

            {/* Line items */}
            <table className="w-full mb-6" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8F6F1", borderBottom: "2px solid #E2DDD6" }}>
                  {["Description", "Qty", "Unit Price", "VAT", "Amount"].map((h) => (
                    <th
                      key={h}
                      className={`py-2.5 px-4 text-xs font-medium uppercase tracking-wider ${h !== "Description" ? "text-right" : "text-left"}`}
                      style={{ color: "#6B7280" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inv.lineItems.map((item, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #E2DDD6" }}>
                    <td className="py-3 px-4 text-sm" style={{ color: "#0A1628" }}>
                      {item.description}
                    </td>
                    <td className="py-3 px-4 text-sm text-right" style={{ fontFamily: "IBM Plex Mono", color: "#4A5568" }}>
                      {item.quantity}
                    </td>
                    <td className="py-3 px-4 text-sm text-right" style={{ fontFamily: "IBM Plex Mono", color: "#4A5568" }}>
                      {formatCurrency(item.unitPrice, inv.currency)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right" style={{ fontFamily: "IBM Plex Mono", color: "#4A5568" }}>
                      {item.taxRate}%
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium" style={{ fontFamily: "IBM Plex Mono", color: "#0A1628" }}>
                      {formatCurrency(item.amount, inv.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-48 space-y-2">
                <div className="flex justify-between text-sm" style={{ color: "#4A5568" }}>
                  <span>Subtotal</span>
                  <span style={{ fontFamily: "IBM Plex Mono" }}>{formatCurrency(inv.subtotal, inv.currency)}</span>
                </div>
                <div className="flex justify-between text-sm" style={{ color: "#4A5568" }}>
                  <span>VAT</span>
                  <span style={{ fontFamily: "IBM Plex Mono" }}>{formatCurrency(inv.taxTotal, inv.currency)}</span>
                </div>
                <div
                  className="flex justify-between font-bold text-base border-t pt-2"
                  style={{ borderColor: "#E2DDD6", color: "#0A1628" }}
                >
                  <span>Total Due</span>
                  <span style={{ fontFamily: "IBM Plex Mono" }}>{formatCurrency(inv.total, inv.currency)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {inv.notes && (
              <div className="mb-6">
                <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "#9CA3AF" }}>Notes</p>
                <p className="text-sm" style={{ color: "#4A5568" }}>{inv.notes}</p>
              </div>
            )}

            {inv.terms && (
              <div className="mb-6">
                <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "#9CA3AF" }}>Terms</p>
                <p className="text-sm" style={{ color: "#4A5568" }}>{inv.terms}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-10 py-4 border-t text-xs" style={{ borderColor: "#E2DDD6", color: "#9CA3AF" }}>
            Generated by InvoiceFlow
          </div>
        </div>
      </div>
    </div>
  );
}
