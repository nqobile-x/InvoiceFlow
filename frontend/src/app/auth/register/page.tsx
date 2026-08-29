"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth";

const schema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Enter a valid email"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[0-9]/, "Include a number"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });
type Form = z.infer<typeof schema>;

export default function RegisterPage() {
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
      const res = await authApi.register({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      });
      const d = res.data;
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
      setError(e.response?.data?.message ?? "Registration failed. Try again.");
    }
  }

  const inputStyle = {
    background: "var(--bg-surface)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
    outline: "none",
  };

  return (
    <div className="min-h-screen flex">
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
            Create your account and start sending professional invoices in minutes.
          </p>
        </div>
        <ul className="space-y-3 text-sm" style={{ color: "var(--text-sidebar)" }}>
          {["PDF invoices with your branding", "PayFast payment links built in", "Automated overdue reminders"].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span className="text-[#C9A84C]">✓</span> {f}
            </li>
          ))}
        </ul>
      </div>

      <div
        className="flex-1 flex items-center justify-center p-8"
        style={{ background: "var(--bg-page)" }}
      >
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "'Playfair Display', serif", color: "var(--text-primary)" }}
            >
              Create account
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              Already have one?{" "}
              <Link href="/auth/login" className="font-medium" style={{ color: "var(--accent-hover)" }}>
                Sign in
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>
                  First name
                </label>
                <input
                  {...register("firstName")}
                  type="text"
                  autoComplete="given-name"
                  className="w-full px-3 py-2.5 text-sm"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "var(--border-focus)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs" style={{ color: "var(--status-overdue)" }}>
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>
                  Last name
                </label>
                <input
                  {...register("lastName")}
                  type="text"
                  autoComplete="family-name"
                  className="w-full px-3 py-2.5 text-sm"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "var(--border-focus)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs" style={{ color: "var(--status-overdue)" }}>
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {(["email", "password", "confirm"] as const).map((field) => (
              <div key={field}>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>
                  {field === "confirm" ? "Confirm password" : field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <input
                  {...register(field)}
                  type={field === "email" ? "email" : "password"}
                  autoComplete={field === "email" ? "email" : field === "password" ? "new-password" : "new-password"}
                  placeholder={field === "email" ? "you@business.co.za" : "••••••••"}
                  className="w-full px-3 py-2.5 text-sm"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "var(--border-focus)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
                {errors[field] && (
                  <p className="mt-1 text-xs" style={{ color: "var(--status-overdue)" }}>
                    {errors[field]?.message}
                  </p>
                )}
              </div>
            ))}

            {error && (
              <p
                className="px-3 py-2 text-sm border"
                style={{ color: "var(--status-overdue)", borderColor: "var(--status-overdue)", background: "#fef2f2" }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#0A1628" }}
            >
              {isSubmitting ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
