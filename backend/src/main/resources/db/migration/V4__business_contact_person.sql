ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS contact_person VARCHAR(200);
