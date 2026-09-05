export interface CurrencyMeta {
  code: string;
  name: string;
  flag: string;
  region: "africa" | "global";
}

export const CURRENCIES: CurrencyMeta[] = [
  { code: "ZAR", name: "South African Rand",   flag: "🇿🇦", region: "africa" },
  { code: "BWP", name: "Botswana Pula",         flag: "🇧🇼", region: "africa" },
  { code: "NAD", name: "Namibian Dollar",       flag: "🇳🇦", region: "africa" },
  { code: "ZMW", name: "Zambian Kwacha",        flag: "🇿🇲", region: "africa" },
  { code: "KES", name: "Kenyan Shilling",       flag: "🇰🇪", region: "africa" },
  { code: "UGX", name: "Ugandan Shilling",      flag: "🇺🇬", region: "africa" },
  { code: "NGN", name: "Nigerian Naira",        flag: "🇳🇬", region: "africa" },
  { code: "GHS", name: "Ghanaian Cedi",         flag: "🇬🇭", region: "africa" },
  { code: "TZS", name: "Tanzanian Shilling",    flag: "🇹🇿", region: "africa" },
  { code: "MWK", name: "Malawian Kwacha",       flag: "🇲🇼", region: "africa" },
  { code: "MZN", name: "Mozambican Metical",    flag: "🇲🇿", region: "africa" },
  { code: "LSL", name: "Lesotho Loti",          flag: "🇱🇸", region: "africa" },
  { code: "SZL", name: "Swazi Lilangeni",       flag: "🇸🇿", region: "africa" },
  { code: "MUR", name: "Mauritian Rupee",       flag: "🇲🇺", region: "africa" },
  { code: "RWF", name: "Rwandan Franc",         flag: "🇷🇼", region: "africa" },
  { code: "ETB", name: "Ethiopian Birr",        flag: "🇪🇹", region: "africa" },
  { code: "USD", name: "US Dollar",             flag: "🇺🇸", region: "global" },
  { code: "EUR", name: "Euro",                  flag: "🇪🇺", region: "global" },
  { code: "GBP", name: "British Pound",         flag: "🇬🇧", region: "global" },
  { code: "AUD", name: "Australian Dollar",     flag: "🇦🇺", region: "global" },
  { code: "CAD", name: "Canadian Dollar",       flag: "🇨🇦", region: "global" },
  { code: "AED", name: "UAE Dirham",            flag: "🇦🇪", region: "global" },
  { code: "INR", name: "Indian Rupee",          flag: "🇮🇳", region: "global" },
  { code: "CNY", name: "Chinese Yuan",          flag: "🇨🇳", region: "global" },
];

// Maps currency code → the locale that gives correct symbol + number grouping
const CURRENCY_LOCALE: Record<string, string> = {
  ZAR: "en-ZA", BWP: "en-BW", NAD: "en-NA", ZMW: "en-ZM",
  KES: "en-KE", UGX: "en-UG", NGN: "en-NG", GHS: "en-GH",
  TZS: "en-TZ", MWK: "en-MW", MZN: "pt-MZ", LSL: "en-LS",
  SZL: "en-SZ", MUR: "en-MU", RWF: "rw-RW", ETB: "am-ET",
  USD: "en-US", EUR: "de-DE", GBP: "en-GB", AUD: "en-AU",
  CAD: "en-CA", AED: "ar-AE", INR: "en-IN", CNY: "zh-CN",
};

// Cache formatters — Intl.NumberFormat construction is expensive
const _cache = new Map<string, Intl.NumberFormat>();
const _cacheCompact = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string, compact = false): Intl.NumberFormat {
  const cache = compact ? _cacheCompact : _cache;
  let fmt = cache.get(currency);
  if (!fmt) {
    const locale = CURRENCY_LOCALE[currency] ?? "en-ZA";
    fmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: compact ? 0 : 2,
      maximumFractionDigits: compact ? 1 : 2,
      ...(compact ? { notation: "compact" } : {}),
    });
    cache.set(currency, fmt);
  }
  return fmt;
}

export function formatCurrency(
  amount: number,
  currency = "ZAR",
  compact = false,
): string {
  return getFormatter(currency, compact).format(amount);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-ZA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function calculateLineItem(
  quantity: number,
  unitPrice: number,
  taxRate: number,
): { subtotal: number; tax: number; amount: number } {
  const subtotal = quantity * unitPrice;
  const tax = subtotal * (taxRate / 100);
  return {
    subtotal: round2(subtotal),
    tax: round2(tax),
    amount: round2(subtotal + tax),
  };
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateInvoiceTotals(
  lineItems: Array<{ quantity: number; unitPrice: number; taxRate: number }>,
): { subtotal: number; taxTotal: number; total: number } {
  let subtotal = 0;
  let taxTotal = 0;
  for (const item of lineItems) {
    const s = item.quantity * item.unitPrice;
    subtotal += s;
    taxTotal += s * (item.taxRate / 100);
  }
  return {
    subtotal: round2(subtotal),
    taxTotal: round2(taxTotal),
    total: round2(subtotal + taxTotal),
  };
}

export function getCurrencyMeta(code: string): CurrencyMeta {
  return CURRENCIES.find((c) => c.code === code) ?? { code, name: code, flag: "🌐", region: "global" };
}
