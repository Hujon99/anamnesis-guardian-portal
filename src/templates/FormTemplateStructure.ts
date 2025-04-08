
/**
 * This file serves as a reference template for the JSON structure of form templates.
 * It is primarily used as documentation and a guide when creating new form templates
 * or understanding the structure.
 *
 * The ConciseFormTemplateExample below demonstrates key features like different
 * question types, conditional logic, handling "Other" options, and mode-specific fields.
 */

// Assuming FormTemplate type is correctly defined in this path
import { FormTemplate } from "@/types/anamnesis";

/**
 * Concise example form template structure demonstrating key features and structure.
 * Includes comments explaining different properties and configurations.
 */
export const ConciseFormTemplateExample: FormTemplate = {
  // Overall title for the form
  title: "Concise Example Form",
  sections: [
    {
      // Title for this logical grouping of questions
      section_title: "Basic Information",
      // No 'show_if' here, so this section always appears initially
      questions: [
        {
          // Unique identifier for the question, used in logic and saving answers
          id: "full_name",
          // The text displayed to the user for the question
          label: "Full Name",
          // Input type - a single line text input
          type: "text",
          // Optional: Indicates if the question must be answered (defaults to false if omitted)
          required: true,
        },
        {
          id: "contact_preference",
          label: "Preferred Contact Method?",
          // Input type - radio buttons, only one option can be selected
          type: "radio",
          // List of selectable options for radio/dropdown/checkbox
          options: ["Email", "Phone", "Other"],
          required: true,
        },
        {
          // ID for the follow-up text question if "Other" is selected above
          id: "contact_preference_övrigt", // Convention: baseID + '_övrigt' or similar
          label: "Specify Other Contact Method:",
          type: "text",
          // Optional: Conditional logic for showing this question
          show_if: {
            // The ID of the question this one depends on
            question: "contact_preference",
            // The value(s) the dependent question must have for this one to show.
            // Can be a single string or an array (for OR logic).
            equals: "Other"
          }
          // 'required' is false by default if omitted
        },
        {
          id: "internal_notes_basic",
          label: "Optician's Internal Notes:",
          type: "text", // Could be 'textarea' if supported by UI for multi-line
          // Optional: Custom flag indicating this question is only for a specific mode/role
          show_in_mode: "optician" // Application logic should check this flag
        }
      ]
    },
    {
      section_title: "Symptom Details",
      // Optional: Conditional logic for showing the ENTIRE section
      show_if: {
        question: "contact_preference",
        // Example of using an array in 'equals' - section shows if preference is Email OR Phone
        equals: ["Email", "Phone"]
      },
      questions: [
        {
          id: "main_symptom",
          label: "Main Symptom?",
          // Input type - dropdown selection list
          type: "dropdown",
          options: ["Headache", "Blurry Vision", "Dry Eyes", "None"],
          required: true
        },
        {
          id: "headache_location",
          label: "Where is the headache located?",
          type: "text",
          // This question only appears if "Headache" was selected above
          show_if: {
            question: "main_symptom",
            equals: "Headache" // Single value match
          },
          required: true // Example: Making a conditional question required if shown
        },
        {
          id: "symptom_optician_notes",
          label: "Optician's Notes on Symptoms:",
          type: "text",
          show_in_mode: "optician" // Another optician-specific field
        }
      ]
    }
    // Add more sections here if needed to demonstrate other features...
  ]
};

/**
 * You can keep other examples here if needed, like the full template
 * or the minimal example, for different reference purposes.
 */

/*
// Example of keeping the full template reference (uncomment and paste if needed)
// This is the DEFAULT template used for organizations if nothing else is specified.
export const FullAnamnesisTemplateReference: FormTemplate = {
  {
  "title": "Standardformulär – Synundersökning",
  "sections": [
    {
      "section_title": "Grundläggande Information",
      "questions": [
        {
          "id": "optiker",
          "label": "Ansvarig optiker",
          "type": "dropdown",
          "options": ["Johanna Haataja", "Hugo Jönsson", "Daniel Niemi"],
          "required": true
        },
        {
          "id": "bokningsorsak",
          "label": "Vad är anledningen till att du bokade denna tid?",
          "type": "radio",
          "options": [
            "Jag behöver nya glasögon eller kontaktlinser.",
            "Jag ser suddigt eller har svårt att fokusera.",
            "Jag har andra problem med ögonen.",
            "Jag vill göra en allmän synkontroll.",
            "Jag behöver remiss.",
            "Jag behöver synintyg.",
            "Övrigt"
          ],
          "required": true
        },
        {
           "id": "bokningsorsak_övrigt",
           "label": "Övrig anledning:",
           "type": "text",
           "show_if": { "question": "bokningsorsak", "equals": "Övrigt" }
        },
        {
          "id": "hjälpmedel",
          "label": "Använder du linser eller glasögon?",
          "type": "radio",
          "options": [
            "Jag använder glasögon",
            "Jag använder linser",
            "Jag använder båda",
            "Nej inget av det"
          ],
          "required": true
        },
        {
          "id": "grundinfo_optiker_ovrigt",
          "label": "Optikerns anteckningar (Övrigt):",
          "type": "text",
          "show_in_mode": "optician"
        }
      ]
    },
    {
      "section_title": "Följdfrågor om glasögon",
       "show_if": {
          "question": "hjälpmedel",
          "equals": ["Jag använder glasögon", "Jag använder båda"]
       },
      "questions": [
        {
          "id": "glasögon_ålder",
          "label": "Hur gamla är dina glasögon?",
          "type": "dropdown",
          "options": [
            "Under 1 år", "1 år", "2 år", "3 år", "4 år", "5 år", "Över 5 år gamla"
          ]
        },
        {
          "id": "glasögon_funktion",
          "label": "Hur har dina glasögon fungerat?",
          "type": "radio",
          "options": [ "Bra", "Dåligt" ]
        },
        {
          "id": "glasögon_optiker_ovrigt",
          "label": "Optikerns anteckningar (Övrigt):",
          "type": "text",
          "show_in_mode": "optician"
        }
      ]
    },
    {
       "section_title": "Följdfrågor om linser",
       "show_if": {
          "question": "hjälpmedel",
          "equals": ["Jag använder linser", "Jag använder båda"]
       },
       "questions": [
         {
            "id": "linskontroll_tid",
            "label": "När gjorde du din senaste linskontroll?",
            "type": "dropdown",
            "options": [
              "Under 1 år", "1 år", "2 år", "3 år", "4 år", "5 år", "Över 5 år"
            ]
          },
          {
            "id": "linsfunktion",
            "label": "Hur har linserna fungerat?",
            "type": "radio",
            "options": [ "Bra", "Dåligt" ]
          },
          {
            "id": "linser_optiker_ovrigt",
            "label": "Optikerns anteckningar (Övrigt):",
            "type": "text",
            "show_in_mode": "optician"
          }
       ]
    },
    {
        "section_title": "Följdfråga om ingen hjälpmedel används",
        "show_if": {
           "question": "hjälpmedel",
           "equals": "Nej inget av det"
        },
        "questions": [
          {
            "id": "senaste_undersökning",
            "label": "När gjorde du din senaste synundersökning?",
            "type": "dropdown",
            "options": [
              "Under 1 år sen", "1 år sen", "2 år sen", "3 år sen", "4 år sen", "5 år sen", "Över 5 år sen", "Aldrig gjort en synundersökning"
            ]
          },
          {
            "id": "ingenhjalp_optiker_ovrigt",
            "label": "Optikerns anteckningar (Övrigt):",
            "type": "text",
            "show_in_mode": "optician"
          }
        ]
    },
    {
      "section_title": "Huvudvärk",
      "questions": [
        {
          "id": "huvudvärk",
          "label": "Har du haft huvudvärk?",
          "type": "radio",
          "options": [ "Ja", "Nej" ]
        },
        {
          "id": "huvudvärk_frekvens",
          "label": "Hur ofta har du huvudvärk?",
          "type": "radio",
          "options": [
            "Varje dag", "Varje vecka", "En gång i månaden", "Mera sällan än en gång i månaden"
          ],
          "show_if": { "question": "huvudvärk", "equals": "Ja" }
        },
        {
          "id": "huvudvärk_placering",
          "label": "Var sitter huvudvärken?",
          "type": "radio",
          "options": [
            "Pannan", "Tinningarna", "Bakhuvudet", "Hela huvudet", "Runt ögonen"
          ],
          "show_if": { "question": "huvudvärk", "equals": "Ja" }
        },
        {
          "id": "huvudvärk_optiker_ovrigt",
          "label": "Optikerns anteckningar (Övrigt):",
          "type": "text",
          "show_in_mode": "optician"
        }
      ]
    },
    {
      "section_title": "Dubbelseende",
      "questions": [
         {
          "id": "dubbelseende",
          "label": "Har du upplevt dubbelseende?",
          "type": "radio",
          "options": [ "Ja", "Nej" ]
        },
        {
          "id": "dubbelseende_frekvens",
          "label": "Hur ofta har du upplevt dubbelseende?",
          "type": "radio",
          "options": [ "Hela tiden", "Då och då" ],
          "show_if": { "question": "dubbelseende", "equals": "Ja" }
        },
        {
          "id": "dubbelseende_öga",
          "label": "Vilket öga har du upplevt dubbelseende i?",
          "type": "radio",
          "options": [ "Höger", "Vänster öga", "Båda ögonen" ],
          "show_if": { "question": "dubbelseende", "equals": "Ja" }
        },
        {
          "id": "dubbelseende_avstånd",
          "label": "Upplever du dubbelseende på nära eller långt håll?",
          "type": "radio",
          "options": [ "Avstånd", "Nära", "Både nära och avstånd" ],
          "show_if": { "question": "dubbelseende", "equals": "Ja" }
        },
        {
          "id": "dubbelseende_optiker_ovrigt",
          "label": "Optikerns anteckningar (Övrigt):",
          "type": "text",
          "show_in_mode": "optician"
        }
      ]
    },
     {
      "section_title": "Övriga besvär",
      "questions": [
        {
          "id": "andra_besvär",
          "label": "Har du några andra besvär med ögonen?",
          "type": "radio",
          "options": [ "Ja", "Nej" ]
        },
        {
          "id": "andra_besvär_typ",
          "label": "Vad har du för besvär med ögonen?",
          "type": "radio",
          "options": [
            "Ont i ögonen", "Torra ögon", "Rinnande ögon", "Trött i ögonen", "Ljuskänsliga ögon", "Problem med mörkerseendet", "Övrigt"
          ],
          "show_if": { "question": "andra_besvär", "equals": "Ja" }
        },
         {
           "id": "andra_besvär_typ_övrigt",
           "label": "Övrigt besvär:",
           "type": "text",
           "show_if": { "question": "andra_besvär_typ", "equals": "Övrigt" }
        },
        {
          "id": "ont_i_ögonen_vilket",
          "label": "Vilket öga har du ont i?",
          "type": "radio",
          "options": [ "Höger öga", "Vänster öga", "Båda ögonen" ],
          "show_if": { "question": "andra_besvär_typ", "equals": "Ont i ögonen" }
        },
        {
          "id": "ont_i_ögonen_när",
          "label": "När märkte du av smärtan?",
          "type": "text",
           "show_if": { "question": "andra_besvär_typ", "equals": "Ont i ögonen" }
        },
        {
          "id": "ont_i_ögonen_uppkomst",
          "label": "Uppstod den plötsligt eller har den kommit successivt?",
          "type": "radio",
          "options": [ "Plötsligt", "Successivt" ],
           "show_if": { "question": "andra_besvär_typ", "equals": "Ont i ögonen" }
        },
        {
          "id": "övrigabesvär_optiker_ovrigt",
          "label": "Optikerns anteckningar (Övrigt):",
          "type": "text",
          "show_in_mode": "optician"
        }
      ]
    },
    {
      "section_title": "Ögonoperationer",
      "questions": [
         {
          "id": "ögonoperation_genomgått",
          "label": "Har du genomgått någon ögonoperation?",
          "type": "radio",
          "options": [ "Ja", "Nej" ]
        },
        {
          "id": "ögonoperation_typ",
          "label": "Vad för operation har du gjort?",
          "type": "radio",
          "options": [
            "Gråstarr-operation (Kataraktoperation)", "Glaukomkirurgi (t.ex. trycksänkande operationer, laserbehandling för grön starr)", "Näthinneoperation (t.ex. vid näthinneavlossning, makulahål, epiretinalt membran)", "Laserbehandling av ögonbotten (t.ex. vid diabetes eller kärlförändringar)", "Synkorrigerande operation (LASIK, LASEK, PRK, ICL, RLE)", "Hornhinnetransplantation (keratoplastik, t.ex. vid keratokonus eller ärrbildning)", "Skelningsoperation (Strabismkirurgi)", "Ögonlocksoperation (t.ex. ptos, blefaroplastik, entropion/ektropion)", "Pterygiumoperation (borttagning av bindvävstillväxt på ögat)", "Övrigt"
          ],
          "show_if": { "question": "ögonoperation_genomgått", "equals": "Ja" }
        },
         {
           "id": "ögonoperation_typ_övrigt",
           "label": "Annan operation:",
           "type": "text",
           "show_if": { "question": "ögonoperation_typ", "equals": "Övrigt" }
        },
        {
          "id": "ögonoperation_vilket_öga",
          "label": "Vilket öga opererades?",
          "type": "radio",
          "options": [ "Höger öga", "Vänster öga", "Båda ögonen" ],
          "show_if": { "question": "ögonoperation_genomgått", "equals": "Ja" }
        },
        {
          "id": "ögonoperation_när",
          "label": "När genomfördes operationen?",
          "type": "radio",
          "options": [ "Under 1 år sedan", "1 år sedan", "2 år sedan", "3 år sedan", "Över 3 år sedan" ],
          "show_if": { "question": "ögonoperation_genomgått", "equals": "Ja" }
        },
        {
          "id": "ögonop_optiker_ovrigt",
          "label": "Optikerns anteckningar (Övrigt):",
          "type": "text",
          "show_in_mode": "optician"
        }
      ]
    },
     {
      "section_title": "Ögonsjukdomar",
      "questions": [
         {
          "id": "ögonsjukdomar_konstaterade",
          "label": "Har du några konstaterade ögonsjukdomar?",
          "type": "radio",
          "options": [ "Ja", "Nej" ]
        },
        {
          "id": "ögonsjukdomar_typ",
          "label": "Vad har du för konstaterade ögonsjukdomar?",
          "type": "radio",
          "options": [
            "Gråstarr (Katarakt)", "Grönstarr (Glaukom)", "Åldersförändringar i gula fläcken (AMD - Age-related Macular Degeneration)", "Diabetesretinopati", "Övrigt"
          ],
          "show_if": { "question": "ögonsjukdomar_konstaterade", "equals": "Ja" }
        },
         {
           "id": "ögonsjukdomar_typ_övrigt",
           "label": "Annan ögonsjukdom:",
           "type": "text",
           "show_if": { "question": "ögonsjukdomar_typ", "equals": "Övrigt" }
        },
        {
          "id": "ögonsjukdomar_vilket_öga",
          "label": "Vilket öga?",
          "type": "radio",
          "options": [ "Höger öga", "Vänster öga", "Båda ögonen" ],
          "show_if": { "question": "ögonsjukdomar_konstaterade", "equals": "Ja" }
        },
        {
          "id": "ögonsjukdomar_uppföljning",
          "label": "Följs du upp regelbundet på grund av detta?",
          "type": "radio",
          "options": [ "Ja", "Nej" ],
          "show_if": { "question": "ögonsjukdomar_konstaterade", "equals": "Ja" }
        },
        {
          "id": "ögonsjd_optiker_ovrigt",
          "label": "Optikerns anteckningar (Övrigt):",
          "type": "text",
          "show_in_mode": "optician"
        }
      ]
    },
    {
      "section_title": "Ärftlighet",
      "questions": [
        {
          "id": "ögonsjukdomar_släkt",
          "label": "Har ni några ögonsjukdomar i släkten?",
          "type": "radio",
          "options": [ "Ja", "Nej", "Vet inte" ]
        },
        {
          "id": "ögonsjukdomar_släkt_typ",
          "label": "Vilken ögonsjukdom har ni i släkten?",
          "type": "radio",
          "options": [
            "Grönstarr (Glaukom)", "Åldersförändringar i gula fläcken (AMD - Age-related Macular Degeneration)", "Keratokonus", "Gråstarr (Katarakt)", "Övrigt"
          ],
          "show_if": { "question": "ögonsjukdomar_släkt", "equals": "Ja" }
        },
         {
           "id": "ögonsjukdomar_släkt_typ_övrigt",
           "label": "Annan ärftlig ögonsjukdom:",
           "type": "text",
           "show_if": { "question": "ögonsjukdomar_släkt_typ", "equals": "Övrigt" }
        },
        {
          "id": "ärftlighet_optiker_ovrigt",
          "label": "Optikerns anteckningar (Övrigt):",
          "type": "text",
          "show_in_mode": "optician"
        }
      ]
    },
    {
      "section_title": "Allmänhälsa",
      "questions": [
         {
          "id": "andra_sjukdomar",
          "label": "Har du andra sjukdomar?",
          "type": "radio",
          "options": [ "Ja", "Nej" ]
        },
        {
          "id": "andra_sjukdomar_lista",
          "label": "Vad har du för sjukdomar?",
          "type": "text",
          "show_if": { "question": "andra_sjukdomar", "equals": "Ja" }
        },
        {
          "id": "allmänhälsa_optiker_ovrigt",
          "label": "Optikerns anteckningar (Övrigt):",
          "type": "text",
          "show_in_mode": "optician"
        }
      ]
    },
    {
       "section_title": "Mediciner",
       "questions": [
         {
          "id": "mediciner",
          "label": "Tar du några mediciner?",
          "type": "radio",
          "options": [ "Ja", "Nej" ]
        },
        {
          "id": "mediciner_lista",
          "label": "Vilka mediciner tar du?",
          "type": "text",
          "show_if": { "question": "mediciner", "equals": "Ja" }
        },
        {
          "id": "mediciner_optiker_ovrigt",
          "label": "Optikerns anteckningar (Övrigt):",
          "type": "text",
          "show_in_mode": "optician"
        }
       ]
    },
     {
       "section_title": "Allergier",
       "questions": [
          {
          "id": "allergier",
          "label": "Har du några allergier?",
          "type": "radio",
          "options": [ "Ja", "Nej" ]
        },
        {
          "id": "allergier_lista",
          "label": "Vad har du för allergier?",
          "type": "text",
          "show_if": { "question": "allergier", "equals": "Ja" }
        },
        {
          "id": "allergier_optiker_ovrigt",
          "label": "Optikerns anteckningar (Övrigt):",
          "type": "text",
          "show_in_mode": "optician"
        }
       ]
    },
    {
       "section_title": "Livsstil",
       "questions": [
          {
            "id": "jobb",
            "label": "Vad jobbar du med?",
            "type": "text"
          },
          {
            "id": "skärmtid_per_dag",
            "label": "Hur länge sitter du vid datorskärmar per dag (timmar)?",
            "type": "radio",
            "options": [ "1", "2", "3", "4", "5", "6", "7", "8", "9", "10+" ]
          },
          {
            "id": "fritidsintressen",
            "label": "Vad har du för fritidsintressen?",
            "type": "text"
          },
          {
            "id": "livsstil_optiker_ovrigt",
            "label": "Optikerns anteckningar (Övrigt):",
            "type": "text",
            "show_in_mode": "optician"
          }
       ]
    }
  ]
}
};
*/

/*
// Example of keeping the minimal template reference
export const MinimalFormTemplateExample: FormTemplate = {
  title: "Enkelt formulär",
  sections: [
    {
      section_title: "Grundinformation",
      questions: [
        { id: "fullname", label: "Namn", type: "text", required: true },
        { id: "reason_for_visit", label: "Anledning till besök", type: "text", required: true }
      ]
    }
  ]
};
*/
