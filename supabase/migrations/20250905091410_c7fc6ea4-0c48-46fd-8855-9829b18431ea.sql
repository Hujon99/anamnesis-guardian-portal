-- Check current constraints on anamnes_entries status column
SELECT 
    con.conname as constraint_name,
    pg_get_constraintdef(con.oid) as constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'anamnes_entries'
  AND con.contype = 'c'
  AND EXISTS (
    SELECT 1 FROM pg_attribute att 
    WHERE att.attrelid = rel.oid 
    AND att.attname = 'status'
    AND att.attnum = ANY(con.conkey)
  );