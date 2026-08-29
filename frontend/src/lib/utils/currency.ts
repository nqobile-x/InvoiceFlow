/**
 * Currency and number formatting utilities.
 * Default currency: ZAR (South African Rand)
 */

const ZAR_FORMATTER = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const ZAR_COMPACT_FORMATTER = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  notation: "compact",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function formatCurrency(
  amount: number,
  currency: string = "ZAR",
  compact = false
): string {
  if (currency === "ZAR") {
    return compact
      ? ZAR_COMPACT_FORMATTER.format(amount)
      : ZAR_FORMATTER.format(amount);
  }
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-ZA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Calculates line item totals.
 * amount = quantity * unitPrice * (1 + taxRate / 100)
 */
export function calculateLineItem(
  quantity: number,
  unitPrice: number,
  taxRate: number
): { subtotal: number; tax: number; amount: number } {
  const subtotal = quantity * unitPrice;
  const tax = subtotal * (taxRate / 100);
  const amount = subtotal + tax;
  return {
    subtotal: round2(subtotal),
    tax: round2(tax),
    amount: round2(amount),
  };
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateInvoiceTotals(
  lineItems: Array<{ quantity: number; unitPrice: number; taxRate: number }>
): { subtotal: number; taxTotal: number; total: number } {
  let subtotal = 0;
  let taxTotal = 0;

  for (const item of lineItems) {
    const s = item.quantity * item.unitPrice;
    const t = s * (item.taxRate / 100);
    subtotal += s;
    taxTotal += t;
  }

  return {
    subtotal: round2(subtotal),
    taxTotal: round2(taxTotal),
    total: round2(subtotal + taxTotal),
  };
}
