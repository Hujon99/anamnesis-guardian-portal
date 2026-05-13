/**
 * Delade utfalls-konstanter och helpers för körkortsundersökningens
 * "assistentens bedömning"-steg.
 *
 * Används av både `ExaminationSummary.tsx` (Genomför i appen) och
 * `ServitJournalDialog.tsx` (Journalför i ServeIT) så att assistenten
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
export const LICENSE_CATEGORY_PREFIX = 'Behörighetstyp: ';

export const getOutcomeLabel = (value: OutcomeValue | '' | undefined): string | undefined => {
  if (!value) return undefined;
  return OUTCOME_OPTIONS.find(o => o.value === value)?.label;
};

export const parseOutcomeFromNotes = (raw: string): { outcome: OutcomeValue | ''; rest: string } => {
  if (!raw) return { outcome: '', rest: '' };
  const lines = raw.split('\n');
  const outcomeLine = lines.find(line => line.startsWith(OUTCOME_PREFIX));
  if (outcomeLine) {
    const label = outcomeLine.slice(OUTCOME_PREFIX.length).trim();
    const match = OUTCOME_OPTIONS.find(o => o.label === label);
    return {
      outcome: match ? match.value : '',
      rest: lines.filter(line => !line.startsWith(OUTCOME_PREFIX) && !line.startsWith(LICENSE_CATEGORY_PREFIX)).join('\n').replace(/^\n+/, ''),
    };
  }
  return {
    outcome: '',
    rest: lines.filter(line => !line.startsWith(LICENSE_CATEGORY_PREFIX)).join('\n').replace(/^\n+/, ''),
  };
};

export const parseLicenseCategoryFromNotes = (raw: string): string | undefined => {
  if (!raw) return undefined;
  const line = raw.split('\n').find((item) => item.startsWith(LICENSE_CATEGORY_PREFIX));
  return line?.slice(LICENSE_CATEGORY_PREFIX.length).trim() || undefined;
};

/**
 * Mappar en sparad behörighetstext (från `Behörighetstyp:` i notes eller från
 * formulärsvar) till det kliniska kravregelverk som ska tillämpas:
 *   - 'lower'  → grupp I (≥ 0,5 binokulärt)
 *   - 'higher' → grupp II/III + förlängning högre/tyngre (≥ 0,8 bästa, ≥ 0,1 sämsta)
 *   - 'taxi'   → taxiförarlegitimation (≥ 0,8 binokulärt)
 * Defaultar till 'lower' om inget matchar (säkrast minimikrav).
 */
export type RequirementGroup = 'lower' | 'higher' | 'taxi';

export const getRequirementGroupFromCategoryName = (
  name?: string,
): RequirementGroup => {
  if (!name) return 'lower';
  const v = name.toLowerCase();
  const normalized = v.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (v.includes('taxi')) return 'taxi';
  if (
    (normalized.includes('forlangning') && (normalized.includes('hogre') || normalized.includes('tyngre'))) ||
    normalized.includes('grupp ii') ||
    normalized.includes('grupp iii') ||
    normalized.includes('grupp 2') ||
    normalized.includes('grupp 3') ||
    normalized.includes('hogre behorighet') ||
    v.includes('lastbil') ||
    v.includes('buss') ||
    v.includes('c1') ||
    /(^|\s|,)c(,|\s|$)/i.test(name) ||
    /(^|\s|,)d(,|\s|$)/i.test(name)
  ) return 'higher';
  return 'lower';
};

/**
 * Kombinerar valt utfall + fritext-anteckning till en notes-sträng som
 * kan sparas direkt i `driving_license_examinations.notes`.
 * Returnerar `null` om båda är tomma (matchar DB-fältets nullable-natur).
 */
export const combineNotesWithOutcome = (
  outcome: OutcomeValue | '',
  freeText: string,
  licenseCategory?: string,
): string | null => {
  const label = getOutcomeLabel(outcome);
  const combined = [
    label ? `${OUTCOME_PREFIX}${label}` : '',
    licenseCategory ? `${LICENSE_CATEGORY_PREFIX}${licenseCategory}` : '',
    freeText.trim(),
  ].filter(Boolean).join('\n\n');
  return combined || null;
};
