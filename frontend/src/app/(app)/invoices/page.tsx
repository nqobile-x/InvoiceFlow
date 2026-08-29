"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { invoiceApi, type InvoiceSummary } from "@/lib/api";
import { formatCurrency } from "@/lib/utils/currency";

const STATUSES = ["ALL", "DRAFT", "SENT", "VIEWED", "PAID", "OVERDUE", "CANCELLED"] as const;
type StatusFilter = (typeof STATUSES)[number];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#6B7280", SENT: "#2563EB", VIEWED: "#7C3AED",
  PAID: "#059669", OVERDUE: "#DC2626", CANCELLED: "#9CA3AF",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-medium uppercase tracking-wider"
      style={{ background: STATUS_COLORS[status] + "18", color: STATUS_COLORS[status] }}
    >
      {status}
    </span>
  );
}

export default function InvoicesPage() {
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", status, page],
    queryFn: () =>
      invoiceApi
        .list({ status: status === "ALL" ? undefined : status, page, size: 20 })
        .then((r) => r.data),
  });

  const invoices: InvoiceSummary[] = data?.content ?? [];

  return (
    <div className="p-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
            Manage
          </p>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "'Playfair Display', serif", color: "var(--text-primary)" }}
          >
            Invoices
          </h1>
        </div>
        <Link
          href="/invoices/new"
          className="px-4 py-2 text-sm font-medium"
          style={{ background: "#C9A84C", color: "#0A1628" }}
        >
          + New Invoice
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 border-b" style={{ borderColor: "var(--border)" }}>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(0); }}
            className="px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors -mb-px"
            style={{
              color: status === s ? "#C9A84C" : "var(--text-muted)",
              borderBottom: status === s ? "2px solid #C9A84C" : "2px solid transparent",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-card)" }}>
        {isLoading ? (
          <div className="py-16 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Loading…
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No invoices{status !== "ALL" ? ` with status "${status}"` : ""} yet.
            </p>
            <Link
              href="/invoices/new"
              className="inline-block mt-3 px-4 py-2 text-sm font-medium"
              style={{ background: "#C9A84C", color: "#0A1628" }}
            >
              Create first invoice
            </Link>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  {["Invoice #", "Client", "Issue Date", "Due Date", "Amount", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b hover:bg-black/[0.02] transition-colors"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="px-5 py-3 text-sm font-medium tabular" style={{ fontFamily: "IBM Plex Mono", color: "var(--text-primary)" }}>
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {inv.clientName}
                    </td>
                    <td className="px-5 py-3 text-sm tabular" style={{ color: "var(--text-muted)" }}>
                      {inv.issueDate}
                    </td>
                    <td className="px-5 py-3 text-sm tabular" style={{ color: "var(--text-muted)" }}>
                      {inv.dueDate}
                    </td>
                    <td className="px-5 py-3 text-sm font-medium tabular" style={{ fontFamily: "IBM Plex Mono", color: "var(--text-primary)" }}>
                      {formatCurrency(inv.total, inv.currency)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-xs font-medium"
                        style={{ color: "var(--accent-hover)" }}
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {(data?.totalPages ?? 0) > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Page {page + 1} of {data?.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 text-xs border disabled:opacity-40"
                    style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page + 1 >= (data?.totalPages ?? 0)}
                    className="px-3 py-1 text-xs border disabled:opacity-40"
                    style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
