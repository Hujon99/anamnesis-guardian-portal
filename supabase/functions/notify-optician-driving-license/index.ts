/**
 * Edge function to send email notifications to opticians when a driving license
 * examination is completed and assigned to them.
 *
 * Mejlet ska innehålla all info som optikern behöver för att fatta beslut
 * direkt från inkorgen — utan att logga in i portalen:
 *   1. Bedömning (utfall) – färgkodat block
 *   2. Patient (förnamn + kundnummer; ALDRIG personnummer)
 *   3. Bokning/butik
 *   4. Assistentens anteckning
 *   5. Komplett anamnes – varje fråga + kundens svar (ordagrant, ingen tolkning)
 *
 * Anamnes-svaren hämtas från `anamnes_entries.answers` och struktureras enligt
 * `anamnes_forms.schema` (sektion → fråga → svar). Personnummer-liknande fält
 * filtreras bort som extra säkerhetsnät (GDPR).
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const FROM_EMAIL = Deno.env.get("RESEND_FROM") || "Lovable <onboarding@resend.dev>";
const TEST_FALLBACK_TO = Deno.env.get("RESEND_TEST_TO") || null;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailNotificationRequest {
  entryId: string;
  opticianEmail?: string;
  appUrl: string;
  completionMethod?: 'app' | 'servit';
  servitCustomerNumber?: string;
  outcomeLabel?: string;
}

const getOutcomeStyling = (label?: string) => {
  if (!label) return { bg: '#f1f5f9', border: '#cbd5e1', text: '#334155', icon: 'ℹ️' };
  const lower = label.toLowerCase();
  if (lower.startsWith('godkänd – kan')) return { bg: '#ecfdf5', border: '#10b981', text: '#065f46', icon: '✅' };
  if (lower.startsWith('godkänd – rek')) return { bg: '#fefce8', border: '#eab308', text: '#854d0e', icon: '⚠️' };
  if (lower.startsWith('optiker ska kontakta')) return { bg: '#fff7ed', border: '#f97316', text: '#9a3412', icon: '📞' };
  if (lower.startsWith('ej godkänd')) return { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', icon: '⛔' };
  return { bg: '#f1f5f9', border: '#cbd5e1', text: '#334155', icon: 'ℹ️' };
};

// HTML-escape allt fritext-innehåll (svar kan innehålla < > & " ').
const escapeHtml = (s: unknown): string => {
  const str = s == null ? '' : String(s);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Filtrera bort personnummer-liknande nycklar/labels (GDPR-säkerhetsnät).
const SENSITIVE_KEY_RE = /(personnummer|personal_?number|ssn|p[\s\-_]?nr)/i;

// Systemmetadata som inte ska visas i optikermailet (oftast hamnar i "Övriga svar").
const EXCLUDED_KEYS = new Set([
  'consent_given',
  'consent_timestamp',
  'terms_version',
  'privacy_policy_version',
  'gdpr_method',
  'gdpr_notes',
  'gdpr_info_type',
  'gdpr_confirmed_by',
  'gdpr_confirmed_by_name',
  'id_verification_completed',
  'id_type',
  'verified_at',
  'verified_by',
]);
const EXCLUDED_KEY_PREFIXES = ['gdpr_', 'id_verification_', 'verified_'];

const isExcludedKey = (key: string): boolean => {
  if (EXCLUDED_KEYS.has(key)) return true;
  return EXCLUDED_KEY_PREFIXES.some((p) => key.startsWith(p));
};

// Följdfråga som "Om ja, beskriv" / "Om nej, beskriv" — visas bara om besvarad.
const FOLLOWUP_LABEL_RE = /^\s*om\s+(ja|nej)\b/i;

const isAnswerEmpty = (value: unknown): boolean => {
  if (value == null || value === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
};

// Formatera ett enskilt svar (string, number, boolean, array, object).
const formatAnswer = (value: unknown): string => {
  if (value == null || value === '') return '(ej besvarad)';
  if (Array.isArray(value)) {
    if (value.length === 0) return '(ej besvarad)';
    return value.map(v => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ');
  }
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nej';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

// Bygg HTML- och text-versioner av anamnes-svar grupperat per sektion.
// Returnerar tomma strängar om inget kunde extraheras.
const buildAnswersBlock = (
  answers: Record<string, unknown> | null | undefined,
  schema: any,
): { html: string; text: string } => {
  if (!answers || typeof answers !== 'object') {
    return { html: '', text: '' };
  }

  const sections: Array<{ title: string; rows: Array<{ q: string; a: string }> }> = [];
  const usedKeys = new Set<string>();

  // Försök strukturera enligt formulärschema.
  if (schema && Array.isArray(schema.sections)) {
    for (const section of schema.sections) {
      const rows: Array<{ q: string; a: string }> = [];
      const questions = Array.isArray(section?.questions) ? section.questions : [];
      for (const q of questions) {
        if (!q?.id || !q?.label) continue;
        if (q.type === 'info') continue; // informationstext, inte en fråga
        if (SENSITIVE_KEY_RE.test(q.id) || SENSITIVE_KEY_RE.test(q.label)) continue;
        usedKeys.add(q.id);
        const value = (answers as Record<string, unknown>)[q.id];
        rows.push({ q: q.label, a: formatAnswer(value) });
      }
      if (rows.length > 0) {
        sections.push({ title: section?.section_title || 'Anamnes', rows });
      }
    }
  }

  // Lägg till eventuella extra svar som inte finns i schemat (t.ex. dynamiska följdfrågor).
  const extraRows: Array<{ q: string; a: string }> = [];
  for (const [key, value] of Object.entries(answers)) {
    if (usedKeys.has(key)) continue;
    if (SENSITIVE_KEY_RE.test(key)) continue;
    // Hoppa över interna metadata-fält
    if (key.startsWith('_') || key === 'metadata') continue;
    extraRows.push({ q: key, a: formatAnswer(value) });
  }
  if (extraRows.length > 0) {
    sections.push({ title: 'Övriga svar', rows: extraRows });
  }

  if (sections.length === 0) {
    return { html: '', text: '' };
  }

  // HTML
  const html = sections.map(s => `
    <div style="margin: 24px 0;">
      <h3 style="margin: 0 0 8px 0; color: #1e40af; font-size: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px;">
        ${escapeHtml(s.title)}
      </h3>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse: collapse; font-size: 14px;">
        <tbody>
          ${s.rows.map((r, i) => `
            <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding: 8px 10px; vertical-align: top; width: 45%; color: #475569; border-bottom: 1px solid #f1f5f9;">
                ${escapeHtml(r.q)}
              </td>
              <td style="padding: 8px 10px; vertical-align: top; color: #0f172a; border-bottom: 1px solid #f1f5f9; white-space: pre-wrap;">
                ${escapeHtml(r.a)}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('');

  // Plain text-variant (för deliverability + klienter utan HTML).
  const text = sections.map(s => {
    const header = `\n${s.title}\n${'-'.repeat(s.title.length)}\n`;
    const body = s.rows.map(r => `${r.q}: ${r.a}`).join('\n');
    return header + body;
  }).join('\n');

  return { html, text };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { entryId, opticianEmail, appUrl, completionMethod, servitCustomerNumber, outcomeLabel }: EmailNotificationRequest = await req.json();
    const method: 'app' | 'servit' = completionMethod === 'servit' ? 'servit' : 'app';

    console.log("Processing email notification for entry:", entryId);

    if (!entryId || !appUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: entryId and appUrl are required' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Hämta entry inklusive answers + form_id för att kunna rendera fullständig anamnes.
    const { data: entryData, error: entryError } = await supabase
      .from('anamnes_entries')
      .select('organization_id, first_name, examination_type, booking_date, optician_id, store_id, patient_identifier, form_id, answers')
      .eq('id', entryId)
      .single();

    if (entryError || !entryData) {
      console.error('Entry fetch error:', entryError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch entry details' }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Organisation
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', entryData.organization_id)
      .single();

    if (orgError || !orgData) {
      console.error('Organization fetch error:', orgError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch organization details' }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Butik (valfri)
    let storeData: { name: string; address: string | null } | null = null;
    if (entryData.store_id) {
      const { data: fetchedStore } = await supabase
        .from('stores')
        .select('name, address')
        .eq('id', entryData.store_id)
        .single();
      if (fetchedStore) storeData = fetchedStore;
    }

    // Formulärschema (för att gruppera och labelmappa svaren).
    let formSchema: any = null;
    if (entryData.form_id) {
      const { data: formData } = await supabase
        .from('anamnes_forms')
        .select('schema')
        .eq('id', entryData.form_id)
        .single();
      formSchema = formData?.schema ?? null;
    }

    // Hämta även driving_license_examinations.notes för att kunna visa
    // assistentens fritext-anteckning (utfallsraden filtreras bort).
    let assistantNote: string | null = null;
    {
      const { data: exam } = await supabase
        .from('driving_license_examinations')
        .select('notes')
        .eq('entry_id', entryId)
        .eq('organization_id', entryData.organization_id)
        .maybeSingle();
      if (exam?.notes) {
        const lines = exam.notes.split('\n');
        const rest = lines[0]?.startsWith('Utfall: ') ? lines.slice(1).join('\n').replace(/^\n/, '') : exam.notes;
        const trimmed = rest.trim();
        if (trimmed) assistantNote = trimmed;
      }
    }

    // Optiker-mejl
    let finalOpticianEmail = opticianEmail;
    if (!finalOpticianEmail && entryData.optician_id) {
      const { data: opticianData, error: opticianError } = await supabase
        .from('users')
        .select('email')
        .eq('clerk_user_id', entryData.optician_id)
        .eq('organization_id', entryData.organization_id)
        .single();

      if (opticianError || !opticianData?.email) {
        console.error('Optician fetch error:', opticianError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch optician email. Please ensure the optician has an email address in their profile.' }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      finalOpticianEmail = opticianData.email;
    }

    if (!finalOpticianEmail) {
      return new Response(
        JSON.stringify({ error: 'No optician email provided and no optician assigned to entry' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const organizationName = orgData.name || "Din organisation";
    const fromAddress = FROM_EMAIL.includes("<") ? FROM_EMAIL : `${organizationName} <${FROM_EMAIL}>`;

    // Subject + headline
    const isServit = method === 'servit';
    const customerNumber = isServit
      ? (servitCustomerNumber || entryData.patient_identifier || '')
      : (entryData.patient_identifier || '');
    const outcomeSuffix = outcomeLabel ? ` – ${outcomeLabel}` : '';
    const subject = isServit
      ? `Körkortsundersökning journalförd i ServeIT${customerNumber ? ` – kundnr ${customerNumber}` : ''}${outcomeSuffix}`
      : `Ny körkortsundersökning tilldelad${customerNumber ? ` – kundnr ${customerNumber}` : ''}${outcomeSuffix}`;

    const headline = isServit
      ? "Journalförd i ServeIT – granska och skicka intyg"
      : "Genomförd i Anamnesportalen – för in i ServeIT";

    const introBlock = isServit
      ? `<p style="margin:0 0 12px 0;">Patienten är journalförd direkt i ServeIT.</p>
         <p style="margin:0;"><strong>Nästa steg:</strong> Granska anamnesen nedan och skicka intyg till Transportstyrelsen.</p>`
      : `<p style="margin:0 0 12px 0;">En körkortsundersökning är genomförd i Anamnesportalen och tilldelad dig.</p>
         <p style="margin:0;"><strong>Nästa steg:</strong> Granska anamnesen nedan, för in resultatet i ServeIT och skicka intyg till Transportstyrelsen.</p>`;

    const outcomeStyle = getOutcomeStyling(outcomeLabel);
    const outcomeBlock = outcomeLabel ? `
      <div style="background-color: ${outcomeStyle.bg}; border-left: 4px solid ${outcomeStyle.border}; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: ${outcomeStyle.text}; opacity: 0.8;">Assistentens bedömning</p>
        <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${outcomeStyle.text};">
          ${outcomeStyle.icon} ${escapeHtml(outcomeLabel)}
        </p>
      </div>` : '';

    const noteBlock = assistantNote ? `
      <div style="background-color:#f8fafc; border-left:4px solid #94a3b8; padding:14px 18px; border-radius:6px; margin:16px 0;">
        <p style="margin:0 0 4px 0; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; color:#475569;">Anteckning från assistent</p>
        <p style="margin:0; font-size:14px; color:#0f172a; white-space:pre-wrap;">${escapeHtml(assistantNote)}</p>
      </div>` : '';

    const bookingDateStr = entryData.booking_date
      ? new Date(entryData.booking_date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;

    const patientBlock = `
      <div style="background-color: #f8fafc; padding: 18px 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 15px;">Patient & bokning</h3>
        <p style="margin:4px 0;"><strong>Namn:</strong> ${escapeHtml(entryData.first_name || 'Okänd patient')}</p>
        ${customerNumber ? `<p style="margin:4px 0;"><strong>Kundnummer:</strong> <span style="font-family:monospace; background:#eff6ff; padding:1px 6px; border-radius:4px;">${escapeHtml(customerNumber)}</span></p>` : ''}
        <p style="margin:4px 0;"><strong>Undersökningstyp:</strong> ${escapeHtml(entryData.examination_type || 'Körkortsundersökning')}</p>
        ${bookingDateStr ? `<p style="margin:4px 0;"><strong>Bokningsdatum:</strong> ${escapeHtml(bookingDateStr)}</p>` : ''}
        ${storeData ? `<p style="margin:4px 0;"><strong>Butik:</strong> ${escapeHtml(storeData.name)}${storeData.address ? ` (${escapeHtml(storeData.address)})` : ''}</p>` : ''}
        <p style="margin:4px 0;"><strong>Organisation:</strong> ${escapeHtml(organizationName)}</p>
      </div>`;

    // Komplett anamnes
    const answersBlocks = buildAnswersBlock(entryData.answers as Record<string, unknown> | null, formSchema);
    const answersHtml = answersBlocks.html
      ? `<div style="margin-top:24px;">
           <h2 style="font-size:16px; color:#1e40af; margin:0 0 8px 0;">Komplett anamnes</h2>
           <p style="font-size:12px; color:#64748b; margin:0 0 8px 0;">Kundens svar — ordagrant, ingen tolkning.</p>
           ${answersBlocks.html}
         </div>`
      : `<p style="color:#64748b; font-style:italic; margin:16px 0;">Inga anamnes-svar registrerade.</p>`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; color:#0f172a;">
        <h2 style="color: #2563eb; margin: 0 0 16px 0;">${escapeHtml(headline)}</h2>
        <p style="margin:0 0 12px 0;">Hej,</p>
        ${introBlock}
        ${outcomeBlock}
        ${patientBlock}
        ${noteBlock}
        ${answersHtml}
        <div style="margin: 30px 0;">
          <a href="https://anamnes.binokeloptik.se/dashboard"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Öppna Dashboard (vid behov)
          </a>
        </div>
        <p style="color: #6b7280; font-size: 12px; border-top:1px solid #e5e7eb; padding-top:12px;">
          Detta är ett automatiskt meddelande från ${escapeHtml(organizationName)}.
          Av GDPR-skäl skickas aldrig personnummer i mejl.
        </p>
      </div>
    `;

    const textBody = [
      headline,
      '',
      outcomeLabel ? `Bedömning: ${outcomeLabel}` : '',
      '',
      `Patient: ${entryData.first_name || 'Okänd patient'}`,
      customerNumber ? `Kundnummer: ${customerNumber}` : '',
      bookingDateStr ? `Bokningsdatum: ${bookingDateStr}` : '',
      storeData ? `Butik: ${storeData.name}${storeData.address ? ` (${storeData.address})` : ''}` : '',
      `Organisation: ${organizationName}`,
      '',
      assistantNote ? `Anteckning från assistent:\n${assistantNote}\n` : '',
      answersBlocks.text ? `Komplett anamnes:${answersBlocks.text}` : 'Inga anamnes-svar registrerade.',
    ].filter(Boolean).join('\n');

    const emailResponse: any = await resend.emails.send({
      from: fromAddress,
      to: [finalOpticianEmail],
      subject,
      html,
      text: textBody,
    });

    console.log("Email send attempt response:", emailResponse);

    if (emailResponse?.error) {
      const errText = typeof emailResponse.error === 'string' ? emailResponse.error : JSON.stringify(emailResponse.error);
      console.warn("Primary email failed:", errText);

      if (TEST_FALLBACK_TO && TEST_FALLBACK_TO !== finalOpticianEmail) {
        const fallback = await resend.emails.send({
          from: fromAddress,
          to: [TEST_FALLBACK_TO],
          subject: "[DEV FALLBACK] " + subject,
          html: `<p>Detta är ett utvecklingsmeddelande eftersom domänen inte är verifierad hos Resend.</p><p>Skulle ha skickats till: ${escapeHtml(finalOpticianEmail)}</p><p>Fel: ${escapeHtml(errText)}</p>` + html,
          text: `[DEV FALLBACK] Skulle ha skickats till: ${finalOpticianEmail}\nFel: ${errText}\n\n${textBody}`,
        });
        console.log("Fallback email send response:", fallback);
      }

      return new Response(JSON.stringify({
        success: false,
        message: "E-post kunde inte skickas till optikern (troligen o-verifierad avsändardomän).",
        hint: "Verifiera avsändardomänen i Resend och sätt RESEND_FROM till en e-post på den domänen.",
        originalError: emailResponse.error,
      }), {
        status: 202,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "E-post skickad till optiker",
      emailId: emailResponse.data?.id,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in notify-optician-driving-license function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Kunde inte skicka e-post", success: false }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
