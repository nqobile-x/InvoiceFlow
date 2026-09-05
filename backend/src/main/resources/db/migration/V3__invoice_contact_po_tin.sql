ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS contact_person      VARCHAR(200),
    ADD COLUMN IF NOT EXISTS purchase_order_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS tin_number          VARCHAR(100);
