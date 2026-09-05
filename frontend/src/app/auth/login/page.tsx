"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth";
import { setRefreshToken } from "@/lib/api";
import type { Metadata } from "next";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(data: Form) {
    setError("");
    try {
      const res = await authApi.login(data);
      const d = res.data;
      setRefreshToken(d.refreshToken);
      login(
        {
          id: d.userId,
          email: d.email,
          firstName: d.firstName,
          lastName: d.lastName,
          hasBusinessProfile: d.hasBusinessProfile,
        },
        d.accessToken
      );
      router.push("/dashboard");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? "Login failed. Check your credentials.");
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-12"
        style={{ background: "var(--bg-sidebar)" }}
      >
        <div>
          <span
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif", color: "#C9A84C" }}
          >
            InvoiceFlow
          </span>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-sidebar-muted)" }}>
            Professional invoicing built for South African businesses.
          </p>
        </div>
        <blockquote className="border-l-2 border-[#C9A84C] pl-4">
          <p className="text-sm italic" style={{ color: "var(--text-sidebar)" }}>
            "Get paid faster. Stay on top of every invoice, every rand."
          </p>
        </blockquote>
      </div>

      {/* Right — form */}
      <div
        className="flex-1 flex items-center justify-center p-8"
        style={{ background: "var(--bg-page)" }}
      >
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <span
              className="text-xl font-bold lg:hidden"
              style={{ fontFamily: "'Playfair Display', serif", color: "#0A1628" }}
            >
              InvoiceFlow
            </span>
            <h1
              className="mt-1 text-2xl font-bold"
              style={{ fontFamily: "'Playfair Display', serif", color: "var(--text-primary)" }}
            >
              Sign in
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              Welcome back. Enter your credentials to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>
                Email
              </label>
              <input
                {...register("email")}
                type="email"
                autoComplete="email"
                placeholder="you@business.co.za"
                className="w-full px-3 py-2.5 text-sm border rounded-none transition-colors"
                style={{
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--border-focus)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              {errors.email && (
                <p className="mt-1 text-xs" style={{ color: "var(--status-overdue)" }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>
                Password
              </label>
              <input
                {...register("password")}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-3 py-2.5 text-sm border rounded-none transition-colors"
                style={{
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--border-focus)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              {errors.password && (
                <p className="mt-1 text-xs" style={{ color: "var(--status-overdue)" }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <p
                className="px-3 py-2 text-sm border"
                style={{
                  color: "var(--status-overdue)",
                  borderColor: "var(--status-overdue)",
                  background: "#fef2f2",
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                background: isSubmitting ? "var(--accent-hover)" : "var(--accent)",
                color: "#0A1628",
              }}
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            No account?{" "}
            <Link href="/auth/register" className="font-medium" style={{ color: "var(--accent-hover)" }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
