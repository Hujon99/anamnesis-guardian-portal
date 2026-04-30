/**
 * Delade utfalls-konstanter och helpers för körkortsundersökningens
 * "assistentens bedömning"-steg.
 *
 * Används av både `ExaminationSummary.tsx` (Genomför i appen) och
 * `ServitJournalDialog.tsx` (Journalför i Servit) så att assistenten
 * alltid väljer ett av samma fyra utfall innan ärendet tilldelas optiker.
 *
 * Utfallet sparas som textprefix i `driving_license_examinations.notes`
 * (`Utfall: <label>`) — på det sättet undviker vi DB-migration men kan
 * fortfarande visa utfallet i UI och i mejlet till optikern.
 */

export const OUTCOME_OPTIONS = [
  { value: 'approved_send', label: 'Godkänd – kan skickas' },
  { value: 'approved_recommend_exam', label: 'Godkänd – rek. synundersökning' },
  { value: 'optician_contact_first', label: 'Optiker ska kontakta innan inskick' },
  { value: 'not_approved', label: 'Ej godkänd' },
] as const;

export type OutcomeValue = typeof OUTCOME_OPTIONS[number]['value'];

export const OUTCOME_PREFIX = 'Utfall: ';

export const getOutcomeLabel = (value: OutcomeValue | '' | undefined): string | undefined => {
  if (!value) return undefined;
  return OUTCOME_OPTIONS.find(o => o.value === value)?.label;
};

export const parseOutcomeFromNotes = (raw: string): { outcome: OutcomeValue | ''; rest: string } => {
  if (!raw) return { outcome: '', rest: '' };
  const lines = raw.split('\n');
  const first = lines[0] ?? '';
  if (first.startsWith(OUTCOME_PREFIX)) {
    const label = first.slice(OUTCOME_PREFIX.length).trim();
    const match = OUTCOME_OPTIONS.find(o => o.label === label);
    return {
      outcome: match ? match.value : '',
      rest: lines.slice(1).join('\n').replace(/^\n/, ''),
    };
  }
  return { outcome: '', rest: raw };
};

/**
 * Kombinerar valt utfall + fritext-anteckning till en notes-sträng som
 * kan sparas direkt i `driving_license_examinations.notes`.
 * Returnerar `null` om båda är tomma (matchar DB-fältets nullable-natur).
 */
export const combineNotesWithOutcome = (
  outcome: OutcomeValue | '',
  freeText: string,
): string | null => {
  const label = getOutcomeLabel(outcome);
  const combined = [
    label ? `${OUTCOME_PREFIX}${label}` : '',
    freeText.trim(),
  ].filter(Boolean).join('\n\n');
  return combined || null;
};
