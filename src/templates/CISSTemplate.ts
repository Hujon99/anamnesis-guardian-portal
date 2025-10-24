/**
 * CISS (Computer and Internet Screen Symptom) Form Template
 * Standardiserat formulär för att bedöma barns skärmvanor och symptom.
 * Använder scoring för att identifiera barn som behöver vidare uppföljning.
 * 
 * Scoring uses string format "Label (score)" where score is extracted by the scoring hook.
 */

import { FormTemplate } from "@/types/anamnesis";

export const CISSTemplate: FormTemplate = {
  title: "CISS - Bedömning av barns skärmvanor",
  sections: [
    {
      section_title: "Bakgrundsinformation",
      questions: [
        {
          id: "child_age",
          label: "Barnets ålder",
          type: "number",
          required: true
        },
        {
          id: "screen_time_weekday",
          label: "Ungefär hur många timmar använder barnet skärmar per dag under vardagar?",
          type: "select",
          required: true,
          options: [
            "Mindre än 1 timme (0)",
            "1-2 timmar (1)",
            "2-4 timmar (2)",
            "4-6 timmar (3)",
            "Mer än 6 timmar (4)"
          ],
          scoring: {
            enabled: true,
            min_value: 0,
            max_value: 4
          }
        },
        {
          id: "screen_time_weekend",
          label: "Ungefär hur många timmar använder barnet skärmar per dag under helger?",
          type: "select",
          required: true,
          options: [
            "Mindre än 1 timme (0)",
            "1-2 timmar (1)",
            "2-4 timmar (2)",
            "4-6 timmar (3)",
            "Mer än 6 timmar (4)"
          ],
          scoring: {
            enabled: true,
            min_value: 0,
            max_value: 4
          }
        }
      ]
    },
    {
      section_title: "Symptombedömning",
      questions: [
        {
          id: "eye_strain",
          label: "Hur ofta upplever barnet trötta eller ansträngda ögon?",
          type: "select",
          required: true,
          options: [
            "Aldrig (0)",
            "Sällan (1)",
            "Ibland (2)",
            "Ofta (3)",
            "Mycket ofta (4)"
          ],
          scoring: {
            enabled: true,
            min_value: 0,
            max_value: 4,
            flag_threshold: 3,
            warning_message: "Barnet upplever frekventa besvär med trötta ögon"
          }
        },
        {
          id: "headache",
          label: "Hur ofta får barnet huvudvärk efter skärmanvändning?",
          type: "select",
          required: true,
          options: [
            "Aldrig (0)",
            "Sällan (1)",
            "Ibland (2)",
            "Ofta (3)",
            "Mycket ofta (4)"
          ],
          scoring: {
            enabled: true,
            min_value: 0,
            max_value: 4,
            flag_threshold: 3,
            warning_message: "Barnet upplever frekventa huvudvärk relaterade till skärmanvändning"
          }
        },
        {
          id: "dry_eyes",
          label: "Hur ofta upplever barnet torra eller irriterade ögon?",
          type: "select",
          required: true,
          options: [
            "Aldrig (0)",
            "Sällan (1)",
            "Ibland (2)",
            "Ofta (3)",
            "Mycket ofta (4)"
          ],
          scoring: {
            enabled: true,
            min_value: 0,
            max_value: 4,
            flag_threshold: 3,
            warning_message: "Barnet har frekventa besvär med torra ögon"
          }
        },
        {
          id: "blurred_vision",
          label: "Hur ofta upplever barnet suddig syn vid eller efter skärmanvändning?",
          type: "select",
          required: true,
          options: [
            "Aldrig (0)",
            "Sällan (1)",
            "Ibland (2)",
            "Ofta (3)",
            "Mycket ofta (4)"
          ],
          scoring: {
            enabled: true,
            min_value: 0,
            max_value: 4,
            flag_threshold: 2,
            warning_message: "Barnet upplever suddig syn i samband med skärmanvändning"
          }
        },
        {
          id: "difficulty_focusing",
          label: "Hur ofta har barnet svårt att fokusera efter längre skärmanvändning?",
          type: "select",
          required: true,
          options: [
            "Aldrig (0)",
            "Sällan (1)",
            "Ibland (2)",
            "Ofta (3)",
            "Mycket ofta (4)"
          ],
          scoring: {
            enabled: true,
            min_value: 0,
            max_value: 4,
            flag_threshold: 3,
            warning_message: "Barnet har frekventa svårigheter med fokusering"
          }
        },
        {
          id: "neck_shoulder_pain",
          label: "Hur ofta upplever barnet nacke eller axelvärk vid skärmanvändning?",
          type: "select",
          required: true,
          options: [
            "Aldrig (0)",
            "Sällan (1)",
            "Ibland (2)",
            "Ofta (3)",
            "Mycket ofta (4)"
          ],
          scoring: {
            enabled: true,
            min_value: 0,
            max_value: 4
          }
        },
        {
          id: "sleep_problems",
          label: "Har barnet svårigheter att somna efter kvällsbruk av skärmar?",
          type: "select",
          required: true,
          options: [
            "Aldrig (0)",
            "Sällan (1)",
            "Ibland (2)",
            "Ofta (3)",
            "Mycket ofta (4)"
          ],
          scoring: {
            enabled: true,
            min_value: 0,
            max_value: 4,
            flag_threshold: 3,
            warning_message: "Barnet har frekventa sömnproblem relaterade till skärmanvändning"
          }
        }
      ]
    },
    {
      section_title: "Synvanor",
      questions: [
        {
          id: "distance_to_screen",
          label: "Ungefär vilket avstånd håller barnet till skärmen?",
          type: "select",
          required: true,
          options: [
            "Mindre än 30 cm (3)",
            "30-40 cm (2)",
            "40-60 cm (0)",
            "Mer än 60 cm (0)"
          ],
          scoring: {
            enabled: true,
            min_value: 0,
            max_value: 3
          }
        },
        {
          id: "breaks_frequency",
          label: "Hur ofta tar barnet pauser under längre skärmanvändning?",
          type: "select",
          required: true,
          options: [
            "Varje 20 minuter eller oftare (0)",
            "Varje 30-60 minuter (1)",
            "Mer sällan än varje timme (2)",
            "Tar inga pauser (3)"
          ],
          scoring: {
            enabled: true,
            min_value: 0,
            max_value: 3
          }
        },
        {
          id: "lighting_conditions",
          label: "Hur är ljusförhållandena när barnet använder skärmar?",
          type: "select",
          required: true,
          options: [
            "Bra dagsljus eller god rumsbelysning (0)",
            "Varierande belysning (1)",
            "Ofta dämpad belysning (2)",
            "Ofta mörkt (3)"
          ],
          scoring: {
            enabled: true,
            min_value: 0,
            max_value: 3
          }
        }
      ]
    },
    {
      section_title: "Tidigare synundersökningar",
      questions: [
        {
          id: "previous_exam",
          label: "Har barnet genomgått synundersökning tidigare?",
          type: "radio",
          required: true,
          options: ["Ja", "Nej"]
        },
        {
          id: "previous_exam_date",
          label: "När var den senaste synundersökningen? (om ja)",
          type: "text",
          required: false,
          show_if: {
            question: "previous_exam",
            equals: "Ja"
          }
        },
        {
          id: "uses_glasses",
          label: "Använder barnet glasögon eller kontaktlinser?",
          type: "radio",
          required: true,
          options: ["Ja, glasögon", "Ja, kontaktlinser", "Nej"]
        }
      ]
    },
    {
      section_title: "Övriga kommentarer",
      questions: [
        {
          id: "additional_info",
          label: "Finns det något mer du vill berätta om barnets skärmanvändning eller symptom?",
          type: "textarea",
          required: false
        }
      ]
    }
  ],
  scoring_config: {
    enabled: true,
    total_threshold: 15,
    show_score_to_patient: false,
    threshold_message: "Bedömningen visar förhöjda besvär. Vi rekommenderar en komplett synundersökning.",
    disable_ai_summary: false
  },
  kiosk_mode: {
    enabled: false,
    require_supervisor_code: false,
    auto_submit: false
  }
};
