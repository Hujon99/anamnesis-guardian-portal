-- Migration: performance indexes for placeholder & journaled cleanup
-- Purpose: Speed up filters used by edge function cleanups

-- Index for magic link placeholders by status and booking date
CREATE INDEX IF NOT EXISTS idx_anamnes_entries_magic_status_booking
  ON public.anamnes_entries (is_magic_link, status, booking_date);

-- Index for link expiration checks
CREATE INDEX IF NOT EXISTS idx_anamnes_entries_expires_at
  ON public.anamnes_entries (expires_at);

-- Index supporting auto redaction/deletion timestamp checks
CREATE INDEX IF NOT EXISTS idx_anamnes_entries_status_auto_ts
  ON public.anamnes_entries (status, auto_deletion_timestamp);
