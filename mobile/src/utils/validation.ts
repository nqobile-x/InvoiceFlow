const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required.";
  if (!EMAIL_RE.test(trimmed)) return "Enter a valid email address.";
  return undefined;
}

export function validatePassword(password: string, minLength = 1): string | undefined {
  if (!password) return "Password is required.";
  if (password.length < minLength) {
    return `Password must be at least ${minLength} characters.`;
  }
  return undefined;
}

export function validateRequired(value: string, label: string): string | undefined {
  if (!value.trim()) return `${label} is required.`;
  return undefined;
}

export function validateIsoDate(value: string, label: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (!ISO_DATE_RE.test(trimmed)) return "Use YYYY-MM-DD format.";
  const [y, m, d] = trimmed.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return `${label} is not a valid calendar date.`;
  }
  return undefined;
}

export function validatePositiveNumber(value: string, label: string, allowZero = false): string | undefined {
  const num = Number(value);
  if (value.trim() === "" || Number.isNaN(num)) return `${label} must be a number.`;
  if (allowZero ? num < 0 : num <= 0) {
    return allowZero ? `${label} cannot be negative.` : `${label} must be greater than 0.`;
  }
  return undefined;
}

export interface LineItemDraft {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
}

export function calculateInvoiceTotals(lines: LineItemDraft[]) {
  return lines.reduce(
    (acc, l) => {
      const qty = parseFloat(l.quantity) || 0;
      const price = parseFloat(l.unitPrice) || 0;
      const tax = parseFloat(l.taxRate) || 0;
      const sub = qty * price;
      const taxAmt = sub * (tax / 100);
      return {
        subtotal: acc.subtotal + sub,
        tax: acc.tax + taxAmt,
        total: acc.total + sub + taxAmt,
      };
    },
    { subtotal: 0, tax: 0, total: 0 }
  );
}
