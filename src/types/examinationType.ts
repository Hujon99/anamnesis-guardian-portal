/**
 * This file defines types related to examination types in the anamnesis system.
 * These types support the new examination type selection feature.
 */

export const EXAMINATION_TYPES = {
  SYNUNDERSÖKNING: 'synundersökning',
  LINSUNDERSÖKNING: 'linsundersökning', 
  KÖRKORTSUNDERSÖKNING: 'körkortsundersökning',
  ALLMÄN: 'allmän'
} as const;

export type ExaminationType = typeof EXAMINATION_TYPES[keyof typeof EXAMINATION_TYPES];

export interface ExaminationTypeOption {
  type: ExaminationType;
  label: string;
  description: string;
  icon: string; // Icon name from lucide-react
}

export const EXAMINATION_TYPE_OPTIONS: ExaminationTypeOption[] = [
  {
    type: EXAMINATION_TYPES.SYNUNDERSÖKNING,
    label: 'Synundersökning',
    description: 'Allmän synundersökning för att kontrollera synskärpa och ögonhälsa',
    icon: 'Eye'
  },
  {
    type: EXAMINATION_TYPES.LINSUNDERSÖKNING,
    label: 'Linsundersökning', 
    description: 'Specialundersökning för kontaktlinser och linsanpassning',
    icon: 'Contact'
  },
  {
    type: EXAMINATION_TYPES.KÖRKORTSUNDERSÖKNING,
    label: 'Körkortsundersökning',
    description: 'Syntest enligt Transportstyrelsens krav för körkort',
    icon: 'Car'
  },
  {
    type: EXAMINATION_TYPES.ALLMÄN,
    label: 'Allmän undersökning',
    description: 'Standardundersökning för allmänna synproblem',
    icon: 'FileText'
  }
];