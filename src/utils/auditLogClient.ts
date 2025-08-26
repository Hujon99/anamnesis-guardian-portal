
/**
 * Purpose:
 *  - Centralized client-side helper for sending access (READ) audit logs to the database via RPC.
 *  - Complements DB triggers that already log INSERT/UPDATE/DELETE on sensitive tables.
 *
 * Context:
 *  - GDPR requires traceability (who accessed what, when, and why). This helper standardizes how we
 *    log access events from the frontend/app context using the public.log_access RPC.
 *  - Use this for "reads" (lists, detail views, specific selections) where triggers cannot capture access.
 *
 * Usage:
 *  - Import and call logAccess() after successful data-fetches (or when opening detail views).
 *  - Keep it "best effort": failures are logged to console but NEVER throw, to avoid UX regressions.
 *
 * Place in system:
 *  - Used across utils/hooks/pages that select data (e.g., lists and details).
 *  - Change logging (writes) is handled by DB triggers and does not require client calls.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type LogAccessParams = {
  table: string;
  recordId?: string | null;
  purpose?: string | null; // e.g., 'detail_view', 'list', 'org_listing', 'assignment_validation'
  route?: string | null;
};

/**
 * Fire-and-forget access logging using the public.log_access RPC.
 * Never throws; logs errors to console for diagnosis.
 */
export const logAccess = async (
  supabase: SupabaseClient,
  { table, recordId = null, purpose = null, route = null }: LogAccessParams
) => {
  // Resolve route from window if not provided (best effort)
  const effectiveRoute =
    route ?? (typeof window !== "undefined" ? window.location.pathname : null);

  // Basic guard
  if (!table) {
    console.warn("logAccess called without table name");
    return;
  }

  // Make RPC call and swallow errors (best effort)
  const { error } = await supabase.rpc("log_access", {
    p_table_name: table,
    p_record_id: recordId ?? null,
    p_purpose: purpose ?? null,
    p_route: effectiveRoute ?? null,
  });

  if (error) {
    // Do not interrupt user flow
    console.warn("[audit] Failed to log access:", {
      table,
      recordId,
      purpose,
      route: effectiveRoute,
      error,
    });
  } else {
    console.debug("[audit] Access logged:", { table, recordId, purpose, route: effectiveRoute });
  }
};
