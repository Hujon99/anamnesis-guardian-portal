-- Seed test data for 'Optik Test' organization
-- Organization id and form id discovered via SELECTs
-- org: org_2v8PrnGp0qGSJrquJs5NaQ2pK4e
-- form: 0c50bdf6-65cd-4aac-bc6e-0098de7b119e (Standardformulär – Optik Test)

-- 1) Two stuck forms: status='sent', created more than 2 hours ago
INSERT INTO public.anamnes_entries (organization_id, form_id, status, created_at, first_name, internal_notes)
VALUES
  ('org_2v8PrnGp0qGSJrquJs5NaQ2pK4e', '0c50bdf6-65cd-4aac-bc6e-0098de7b119e', 'sent', now() - interval '3 hours', 'Stuck Alice', 'Seed: stuck >2h'),
  ('org_2v8PrnGp0qGSJrquJs5NaQ2pK4e', '0c50bdf6-65cd-4aac-bc6e-0098de7b119e', 'sent', now() - interval '5 hours', 'Stuck Bob', 'Seed: stuck >2h');

-- 2) Two expired forms: status='ready', auto_deletion_timestamp in the past
INSERT INTO public.anamnes_entries (organization_id, form_id, status, created_at, auto_deletion_timestamp, first_name, internal_notes)
VALUES
  ('org_2v8PrnGp0qGSJrquJs5NaQ2pK4e', '0c50bdf6-65cd-4aac-bc6e-0098de7b119e', 'ready', now() - interval '50 hours', now() - interval '1 hour', 'Expired Carol', 'Seed: ready with past auto_deletion_timestamp'),
  ('org_2v8PrnGp0qGSJrquJs5NaQ2pK4e', '0c50bdf6-65cd-4aac-bc6e-0098de7b119e', 'ready', now() - interval '60 hours', now() - interval '10 minutes', 'Expired Dave', 'Seed: ready with past auto_deletion_timestamp');

-- 3) One fresh form: status='sent', created within last hour
INSERT INTO public.anamnes_entries (organization_id, form_id, status, created_at, first_name, internal_notes)
VALUES
  ('org_2v8PrnGp0qGSJrquJs5NaQ2pK4e', '0c50bdf6-65cd-4aac-bc6e-0098de7b119e', 'sent', now() - interval '30 minutes', 'Fresh Eve', 'Seed: fresh sent <2h');