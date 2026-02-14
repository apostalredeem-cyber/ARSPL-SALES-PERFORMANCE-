-- 1️⃣ Add sequence
CREATE SEQUENCE IF NOT EXISTS lead_business_seq START 1;

-- 2️⃣ Add business_id column
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS business_id TEXT;

-- 3️⃣ Create generator function
CREATE OR REPLACE FUNCTION generate_lead_business_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.business_id IS NULL THEN
    NEW.business_id :=
      'ARSPL/CLIENT/' ||
      LPAD(nextval('lead_business_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4️⃣ Attach trigger
DROP TRIGGER IF EXISTS trg_generate_lead_business_id ON leads;

CREATE TRIGGER trg_generate_lead_business_id
BEFORE INSERT ON leads
FOR EACH ROW
EXECUTE FUNCTION generate_lead_business_id();

-- 5️⃣ Backfill existing rows
UPDATE leads
SET business_id =
  'ARSPL/CLIENT/' ||
  LPAD(nextval('lead_business_seq')::TEXT, 3, '0')
WHERE business_id IS NULL;

-- 6️⃣ Make NOT NULL + UNIQUE
ALTER TABLE leads
ALTER COLUMN business_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS leads_business_id_key
ON leads(business_id);
