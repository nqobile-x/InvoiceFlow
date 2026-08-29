-- Index for PayFast ITN lookup by payment ID
CREATE INDEX idx_invoices_payfast_payment_id ON invoices(payfast_payment_id)
    WHERE payfast_payment_id IS NOT NULL;
