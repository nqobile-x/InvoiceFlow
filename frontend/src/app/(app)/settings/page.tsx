"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { businessApi, type Business } from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { CurrencyPicker } from "@/components/ui/CurrencyPicker";

const schema = z.object({
  name: z.string().min(1, "Business name is required"),
  email: z.string().email().or(z.literal("")).optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  registrationNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().default("ZAR"),
  invoicePrefix: z.string().default("INV"),
  paymentTermsDays: z.coerce.number().int().min(1).default(30),
  primaryColor: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankBranchCode: z.string().optional(),
  watermarkEnabled: z.boolean().default(false),
  watermarkText: z.string().max(20).optional(),
  contactPerson: z.string().max(200).optional(),
});
type Form = z.infer<typeof schema>;

const IS = {
  background: "var(--bg-page)",
  color: "var(--text-primary)",
  border: "1px solid var(--border)",
};
const inputCls = "w-full px-3 py-2 text-sm border rounded-none outline-none";

function Field({ label, children, span2 = false }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6 mb-4" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-card)" }}>
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: "var(--text-muted)" }}>
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const { user, updateHasBusinessProfile } = useAuthStore();
  const [toastMsg, setToastMsg] = useState("");
  const hasProfile = user?.hasBusinessProfile ?? false;
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data: business, isLoading } = useQuery<Business>({
    queryKey: ["business"],
    queryFn: () => businessApi.get().then((r) => r.data),
    enabled: hasProfile,
    retry: false,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const primaryColor = watch("primaryColor") ?? "#0A1628";
  const currency = watch("currency") ?? "ZAR";
  const watermarkEnabled = watch("watermarkEnabled");

  useEffect(() => {
    if (business) {
      reset({
        name: business.name,
        email: business.email ?? "",
        phone: business.phone ?? "",
        website: business.website ?? "",
        registrationNumber: business.registrationNumber ?? "",
        vatNumber: business.vatNumber ?? "",
        addressLine1: business.addressLine1 ?? "",
        addressLine2: business.addressLine2 ?? "",
        city: business.city ?? "",
        province: business.province ?? "",
        postalCode: business.postalCode ?? "",
        country: business.country ?? "ZA",
        currency: business.currency ?? "ZAR",
        invoicePrefix: business.invoicePrefix ?? "INV",
        paymentTermsDays: business.paymentTermsDays ?? 30,
        primaryColor: business.primaryColor ?? "#0A1628",
        bankName: business.bankName ?? "",
        bankAccountNumber: business.bankAccountNumber ?? "",
        bankBranchCode: business.bankBranchCode ?? "",
        watermarkEnabled: business.watermarkEnabled ?? false,
        watermarkText: business.watermarkText ?? "",
        contactPerson: business.contactPerson ?? "",
      });
      if (business.logoUrl) setLogoPreview(business.logoUrl);
    }
  }, [business, reset]);

  // Logo upload
  const { mutate: uploadLogo, isPending: uploadingLogo } = useMutation({
    mutationFn: (file: File) => businessApi.uploadLogo(file),
    onSuccess: (res) => {
      setLogoPreview(res.data.logoUrl);
      qc.invalidateQueries({ queryKey: ["business"] });
      setToastMsg("Logo updated.");
    },
    onError: () => setToastMsg("Logo upload failed. Max 5 MB, PNG/JPG only."),
  });

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Local preview immediately
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
    uploadLogo(file);
  }

  const { mutate: save } = useMutation({
    mutationFn: (data: Form) => {
      if (hasProfile) return businessApi.update(data);
      return businessApi.create(data as Parameters<typeof businessApi.create>[0]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business"] });
      if (!hasProfile) {
        updateHasBusinessProfile(true);
      }
      setToastMsg("Settings saved.");
    },
    onError: () => setToastMsg("Failed to save. Try again."),
  });

  if (isLoading && hasProfile) {
    return <div className="p-8 text-sm" style={{ color: "var(--text-muted)" }}>Loading…</div>;
  }

  return (
    <div className="p-8 max-w-3xl">
      {toastMsg && (
        <div
          className="fixed top-4 right-4 px-4 py-3 text-sm font-medium shadow-lg z-50"
          style={{ background: "var(--bg-sidebar)", color: "#C9A84C" }}
        >
          {toastMsg}
          <button className="ml-4 opacity-60 hover:opacity-100" onClick={() => setToastMsg("")}>✕</button>
        </div>
      )}

      <div className="mb-7">
        <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Account</p>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "var(--text-primary)" }}>
          Business Settings
        </h1>
      </div>

      {/* ── Logo ────────────────────────────────────────────── */}
      <div className="p-6 mb-4" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-card)" }}>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: "var(--text-muted)" }}>
          Business Logo
        </h2>
        <div className="flex items-center gap-6">
          {/* Preview */}
          <div
            className="w-24 h-24 flex items-center justify-center border overflow-hidden shrink-0"
            style={{ borderColor: "var(--border)", background: "var(--bg-page)" }}
          >
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" style={{ color: "var(--border)" }}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            )}
          </div>

          <div>
            <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
              Appears on all your PDF invoices. PNG or JPG, max 5 MB.
            </p>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleLogoChange}
            />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="px-4 py-2 text-sm font-medium border disabled:opacity-50"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-page)" }}
            >
              {uploadingLogo ? "Uploading…" : logoPreview ? "Change Logo" : "Upload Logo"}
            </button>
            {logoPreview && (
              <button
                type="button"
                onClick={() => { setLogoPreview(null); if (logoInputRef.current) logoInputRef.current.value = ""; }}
                className="ml-3 text-xs"
                style={{ color: "var(--status-overdue)" }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => save(d))}>
        <Section title="Business Identity">
          <Field label="Business Name *">
            <input {...register("name")} className={inputCls} style={IS} />
            {errors.name && <p className="mt-1 text-xs" style={{ color: "var(--status-overdue)" }}>{errors.name.message}</p>}
          </Field>
          <Field label="Email">
            <input {...register("email")} type="email" className={inputCls} style={IS} />
          </Field>
          <Field label="Phone">
            <input {...register("phone")} className={inputCls} style={IS} />
          </Field>
          <Field label="Website">
            <input {...register("website")} type="url" placeholder="https://" className={inputCls} style={IS} />
          </Field>
          <Field label="Registration Number">
            <input {...register("registrationNumber")} className={inputCls} style={IS} />
          </Field>
          <Field label="VAT Number">
            <input {...register("vatNumber")} className={inputCls} style={IS} />
          </Field>
          <Field label="Contact Person" span2>
            <input {...register("contactPerson")} placeholder="Primary contact name on invoices" className={inputCls} style={IS} />
          </Field>
        </Section>

        <Section title="Address">
          <Field label="Street Address" span2>
            <input {...register("addressLine1")} className={inputCls} style={IS} />
          </Field>
          <Field label="Address Line 2" span2>
            <input {...register("addressLine2")} className={inputCls} style={IS} />
          </Field>
          <Field label="City">
            <input {...register("city")} className={inputCls} style={IS} />
          </Field>
          <Field label="Province">
            <input {...register("province")} className={inputCls} style={IS} />
          </Field>
          <Field label="Postal Code">
            <input {...register("postalCode")} className={inputCls} style={IS} />
          </Field>
          <Field label="Country">
            <input {...register("country")} className={inputCls} style={IS} />
          </Field>
        </Section>

        <Section title="Invoice Preferences">
          <Field label="Invoice Prefix">
            <input {...register("invoicePrefix")} className={inputCls} style={IS} placeholder="INV" />
          </Field>
          <Field label="Payment Terms (days)">
            <input {...register("paymentTermsDays")} type="number" min={1} className={inputCls} style={IS} />
          </Field>
          <Field label="Currency" span2>
            <CurrencyPicker
              value={currency}
              onChange={(code) => setValue("currency", code, { shouldDirty: true })}
            />
          </Field>
          <Field label="Invoice Brand Colour">
            <div className="flex gap-2 items-center">
              {/* Color swatch — NOT registered; syncs via setValue */}
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setValue("primaryColor", e.target.value, { shouldDirty: true })}
                className="h-9 w-12 border cursor-pointer p-0.5 rounded-none"
                style={{ border: "1px solid var(--border)", background: "var(--bg-page)" }}
                title="Pick brand colour"
              />
              {/* Text input — the registered field */}
              <input
                {...register("primaryColor")}
                placeholder="#0A1628"
                className={inputCls + " flex-1"}
                style={IS}
              />
              {/* Live preview chip */}
              <div
                className="w-9 h-9 shrink-0 border"
                style={{ background: primaryColor, borderColor: "var(--border)" }}
                title={primaryColor}
              />
            </div>
          </Field>
        </Section>

        <Section title="Banking Details">
          <Field label="Bank Name">
            <input {...register("bankName")} className={inputCls} style={IS} placeholder="e.g. FNB, Standard Bank" />
          </Field>
          <Field label="Branch Code">
            <input {...register("bankBranchCode")} className={inputCls} style={IS} />
          </Field>
          <Field label="Account Number" span2>
            <input {...register("bankAccountNumber")} className={inputCls} style={IS} />
          </Field>
        </Section>

        {/* Watermark */}
        <div className="p-6 mb-6" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-card)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: "var(--text-muted)" }}>
            Invoice Watermark
          </h2>
          <div className="flex items-center gap-3 mb-4">
            <input {...register("watermarkEnabled")} type="checkbox" id="wm" className="w-4 h-4 cursor-pointer" />
            <label htmlFor="wm" className="text-sm cursor-pointer" style={{ color: "var(--text-primary)" }}>
              Add watermark to sent invoices
            </label>
          </div>
          {watermarkEnabled && (
            <Field label="Watermark Text (max 20 chars)">
              <input
                {...register("watermarkText")}
                maxLength={20}
                placeholder="e.g. SUPPLYNEX, CONFIDENTIAL"
                className={inputCls + " max-w-xs"}
                style={IS}
              />
            </Field>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 text-sm font-medium disabled:opacity-50"
          style={{ background: "#C9A84C", color: "#0A1628" }}
        >
          {isSubmitting ? "Saving…" : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
