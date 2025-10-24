-- Funktion som skapar store_forms assignments för ett formulär till alla butiker i organisationen
CREATE OR REPLACE FUNCTION auto_assign_form_to_stores()
RETURNS TRIGGER AS $$
BEGIN
  -- Skapa assignments för det nya formuläret till alla butiker i samma organisation
  INSERT INTO store_forms (store_id, form_id, organization_id, is_active)
  SELECT 
    s.id,
    NEW.id,
    NEW.organization_id,
    true
  FROM stores s
  WHERE s.organization_id = NEW.organization_id
  ON CONFLICT (store_id, form_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Funktion som skapar store_forms assignments för en butik till alla formulär i organisationen
CREATE OR REPLACE FUNCTION auto_assign_store_to_forms()
RETURNS TRIGGER AS $$
BEGIN
  -- Skapa assignments för den nya butiken till alla formulär i samma organisation
  INSERT INTO store_forms (store_id, form_id, organization_id, is_active)
  SELECT 
    NEW.id,
    f.id,
    NEW.organization_id,
    true
  FROM anamnes_forms f
  WHERE f.organization_id = NEW.organization_id
  ON CONFLICT (store_id, form_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger för nya formulär
DROP TRIGGER IF EXISTS trigger_auto_assign_form_to_stores ON anamnes_forms;
CREATE TRIGGER trigger_auto_assign_form_to_stores
  AFTER INSERT ON anamnes_forms
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_form_to_stores();

-- Trigger för nya butiker
DROP TRIGGER IF EXISTS trigger_auto_assign_store_to_forms ON stores;
CREATE TRIGGER trigger_auto_assign_store_to_forms
  AFTER INSERT ON stores
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_store_to_forms();

-- Backfill: Skapa assignments för alla befintliga kombinationer som saknas
INSERT INTO store_forms (store_id, form_id, organization_id, is_active)
SELECT 
  s.id as store_id,
  f.id as form_id,
  s.organization_id,
  true as is_active
FROM stores s
CROSS JOIN anamnes_forms f
WHERE s.organization_id = f.organization_id
  AND NOT EXISTS (
    SELECT 1 
    FROM store_forms sf 
    WHERE sf.store_id = s.id 
      AND sf.form_id = f.id
  )
ON CONFLICT (store_id, form_id) DO NOTHING;