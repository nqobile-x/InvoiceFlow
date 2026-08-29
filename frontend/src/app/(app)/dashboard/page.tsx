"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi, type DashboardSummary, type RevenueData, type InvoiceSummary } from "@/lib/api";
import { formatCurrency } from "@/lib/utils/currency";
import { useAuthStore } from "@/lib/store/auth";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#6B7280",
  SENT: "#2563EB",
  VIEWED: "#7C3AED",
  PAID: "#059669",
  OVERDUE: "#DC2626",
  CANCELLED: "#9CA3AF",
};

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      className="p-5 flex flex-col gap-1"
      style={{
        background: "var(--bg-surface)",
        boxShadow: "var(--shadow-card)",
        borderTop: accent ? `3px solid ${accent}` : undefined,
      }}
    >
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="text-2xl font-bold tabular" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--text-primary)" }}>
        {value}
      </p>
      {sub && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-medium uppercase tracking-wider"
      style={{
        background: STATUS_COLORS[status] + "18",
        color: STATUS_COLORS[status],
      }}
    >
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: summary } = useQuery<DashboardSummary>({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboardApi.summary().then((r) => r.data),
  });

  const { data: revenue = [] } = useQuery<RevenueData[]>({
    queryKey: ["dashboard", "revenue"],
    queryFn: () => dashboardApi.revenue().then((r) => r.data),
  });

  const { data: recent = [] } = useQuery<InvoiceSummary[]>({
    queryKey: ["dashboard", "recent"],
    queryFn: () => dashboardApi.recentInvoices().then((r) => r.data),
  });

  const cur = summary?.currency ?? "ZAR";
  const n = (v: unknown) => Number(v) || 0;

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
            Good {getTimeGreeting()}
          </p>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "'Playfair Display', serif", color: "var(--text-primary)" }}
          >
            {user?.firstName} {user?.lastName}
          </h1>
        </div>
        <Link
          href="/invoices/new"
          className="px-4 py-2 text-sm font-medium transition-colors"
          style={{ background: "#C9A84C", color: "#0A1628" }}
        >
          + New Invoice
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Invoiced"
          value={summary ? formatCurrency(n(summary.totalInvoiced), cur, true) : "—"}
          sub={`${summary?.invoiceCount ?? 0} invoices`}
          accent="#C9A84C"
        />
        <StatCard
          label="Collected"
          value={summary ? formatCurrency(n(summary.totalPaid), cur, true) : "—"}
          accent="#059669"
        />
        <StatCard
          label="Outstanding"
          value={summary ? formatCurrency(n(summary.totalOutstanding), cur, true) : "—"}
          accent="#2563EB"
        />
        <StatCard
          label="Overdue"
          value={summary ? formatCurrency(n(summary.totalOverdue), cur, true) : "—"}
          accent="#DC2626"
        />
      </div>

      {/* Revenue chart */}
      <div
        className="p-6 mb-6"
        style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-5" style={{ color: "var(--text-secondary)" }}>
          Revenue — Last 12 Months
        </h2>
        {revenue.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenue} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "IBM Plex Mono" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "IBM Plex Mono" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 0,
                  fontSize: 12,
                  fontFamily: "IBM Plex Mono",
                }}
                formatter={(value: number) => [formatCurrency(value, cur), ""]}
              />
              <Area
                type="monotone"
                dataKey="paid"
                name="Paid"
                stroke="#C9A84C"
                strokeWidth={2}
                fill="url(#goldGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#C9A84C" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
            <p className="text-sm">No revenue data yet. Send your first invoice.</p>
          </div>
        )}
      </div>

      {/* Recent invoices */}
      <div style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            Recent Invoices
          </h2>
          <Link href="/invoices" className="text-xs font-medium" style={{ color: "var(--accent-hover)" }}>
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            No invoices yet.{" "}
            <Link href="/invoices/new" style={{ color: "var(--accent-hover)" }}>
              Create one
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                {["Invoice", "Client", "Amount", "Due", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b hover:bg-black/[0.02] transition-colors cursor-pointer"
                  style={{ borderColor: "var(--border)" }}
                  onClick={() => (window.location.href = `/invoices/${inv.id}`)}
                >
                  <td className="px-6 py-3 text-sm font-medium tabular" style={{ fontFamily: "IBM Plex Mono", color: "var(--text-primary)" }}>
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-6 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {inv.clientName}
                  </td>
                  <td className="px-6 py-3 text-sm tabular" style={{ fontFamily: "IBM Plex Mono", color: "var(--text-primary)" }}>
                    {formatCurrency(inv.total, inv.currency)}
                  </td>
                  <td className="px-6 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {inv.dueDate}
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
