import test from "node:test";
import assert from "node:assert/strict";
import {
  validateEmail,
  validatePassword,
  validateRequired,
  validateIsoDate,
  validatePositiveNumber,
  calculateInvoiceTotals,
} from "../src/utils/validation.ts";
import { formatCurrency, formatDate } from "../src/utils/currency.ts";

test("validateEmail rejects empty and malformed addresses, accepts valid", () => {
  assert.ok(validateEmail(""));
  assert.ok(validateEmail("not-an-email"));
  assert.ok(validateEmail("a@b"));
  assert.equal(validateEmail("nqobile@invoiceflow.co.za"), undefined);
  assert.equal(validateEmail("  user+tag@company.co.za  "), undefined);
});

test("validatePassword enforces minimum length", () => {
  assert.ok(validatePassword("", 1));
  assert.equal(validatePassword("a", 1), undefined);
  assert.ok(validatePassword("short77", 8));
  assert.equal(validatePassword("Str0ngPass!", 8), undefined);
});

test("validateRequired rejects whitespace-only values", () => {
  assert.ok(validateRequired("   ", "Business name"));
  assert.equal(validateRequired("KZN Studio", "Business name"), undefined);
});

test("validateIsoDate validates real calendar dates", () => {
  assert.equal(validateIsoDate("2026-11-22", "Issue date"), undefined);
  assert.ok(validateIsoDate("22-11-2026", "Issue date"));
  assert.ok(validateIsoDate("2026-02-30", "Due date"));
  assert.ok(validateIsoDate("", "Due date"));
});

test("validatePositiveNumber enforces numeric bounds", () => {
  assert.ok(validatePositiveNumber("", "Qty"));
  assert.ok(validatePositiveNumber("abc", "Qty"));
  assert.ok(validatePositiveNumber("0", "Qty", false));
  assert.equal(validatePositiveNumber("0", "Price", true), undefined);
  assert.ok(validatePositiveNumber("-5", "Price", true));
  assert.equal(validatePositiveNumber("15.5", "VAT", true), undefined);
});

test("calculateInvoiceTotals computes subtotal, VAT, and grand total accurately", () => {
  const res = calculateInvoiceTotals([
    { id: "1", description: "Design", quantity: "2", unitPrice: "1000", taxRate: "15" },
    { id: "2", description: "Hosting", quantity: "1", unitPrice: "500", taxRate: "0" },
  ]);
  assert.equal(res.subtotal, 2500);
  assert.equal(res.tax, 300);
  assert.equal(res.total, 2800);
});

test("formatCurrency and formatDate handle valid and empty inputs safely", () => {
  assert.match(formatCurrency(19550, "ZAR"), /19[\s,]550/);
  assert.match(formatCurrency(null, "ZAR"), /0[.,]00/);
  assert.equal(formatDate(null), "—");
  assert.match(formatDate("2026-11-22"), /2026/);
});
