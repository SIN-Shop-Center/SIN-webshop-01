-- Purpose: GPSR Responsible Person (EU-Verordnung 2023/988)
-- Pflicht seit Dezember 2024 für alle in der EU verkauften Produkte
-- Dokumentation: https://eugpsr.eu

-- Manufacturer (Hersteller) auf Produkt-Ebene
ALTER TABLE shop.products
  ADD COLUMN IF NOT EXISTS manufacturer_name text NOT NULL DEFAULT 'ShopSIN',
  ADD COLUMN IF NOT EXISTS manufacturer_address text NOT NULL DEFAULT 'Kurfürstenstraße 124, 10785 Berlin, Germany',
  ADD COLUMN IF NOT EXISTS manufacturer_email text NOT NULL DEFAULT 'zukunftsorientierte.energie@gmail.com',
  ADD COLUMN IF NOT EXISTS manufacturer_phone text NOT NULL DEFAULT '+49 176 41556786';

-- Responsible Person (EU-Verantwortlicher) auf Produkt-Ebene
ALTER TABLE shop.products
  ADD COLUMN IF NOT EXISTS responsible_person_name text NOT NULL DEFAULT 'Jeremy Schulze',
  ADD COLUMN IF NOT EXISTS responsible_person_company text NOT NULL DEFAULT 'ShopSIN',
  ADD COLUMN IF NOT EXISTS responsible_person_address text NOT NULL DEFAULT 'Kurfürstenstraße 124, 10785 Berlin, Germany',
  ADD COLUMN IF NOT EXISTS responsible_person_email text NOT NULL DEFAULT 'zukunftsorientierte.energie@gmail.com',
  ADD COLUMN IF NOT EXISTS responsible_person_phone text NOT NULL DEFAULT '+49 176 41556786';

-- Kommentare für Dokumentation
COMMENT ON COLUMN shop.products.manufacturer_name IS 'GPSR: Name des Herstellers';
COMMENT ON COLUMN shop.products.manufacturer_address IS 'GPSR: Adresse des Herstellers';
COMMENT ON COLUMN shop.products.manufacturer_email IS 'GPSR: E-Mail des Herstellers';
COMMENT ON COLUMN shop.products.manufacturer_phone IS 'GPSR: Telefon des Herstellers';
COMMENT ON COLUMN shop.products.responsible_person_name IS 'GPSR: Name der verantwortlichen Person in der EU';
COMMENT ON COLUMN shop.products.responsible_person_company IS 'GPSR: Firmenname (optional)';
COMMENT ON COLUMN shop.products.responsible_person_address IS 'GPSR: Adresse der verantwortlichen Person';
COMMENT ON COLUMN shop.products.responsible_person_email IS 'GPSR: Kontaktperson E-Mail';
COMMENT ON COLUMN shop.products.responsible_person_phone IS 'GPSR: Kontaktperson Telefon';
