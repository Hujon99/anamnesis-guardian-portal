
/**
 * This file serves as a reference template for the JSON structure of form templates.
 * It is not meant to be imported directly in code, but rather to be used as documentation
 * and a template when creating new form templates or understanding the structure.
 * 
 * The template provides a comprehensive example of all possible question types,
 * conditional fields, and section organization for anamnesis forms.
 */

import { FormTemplate } from "@/types/anamnesis";

/**
 * Example form template structure showing all possible configurations
 */
export const FormTemplateExample: FormTemplate = {
  title: "Patientformulär",
  sections: [
    {
      section_title: "Personuppgifter",
      questions: [
        {
          id: "name",
          label: "Namn",
          type: "text",
          required: true,
        },
        {
          id: "birthdate",
          label: "Födelsedatum",
          type: "text",
          required: true,
        },
        {
          id: "phone",
          label: "Telefon",
          type: "text",
          required: false,
        },
        {
          id: "email",
          label: "E-post",
          type: "text",
          required: false,
        }
      ]
    },
    {
      section_title: "Medicinsk historia",
      questions: [
        {
          id: "existing_conditions",
          label: "Har du någon av följande tillstånd?",
          type: "checkbox",
          options: [
            "Högt blodtryck",
            "Diabetes",
            "Glaukom",
            "Katarakt",
            "Annat"
          ],
          required: true,
        },
        {
          id: "existing_conditions_other",
          label: "Om annat, vänligen specificera",
          type: "text",
          required: false,
          show_if: {
            question: "existing_conditions",
            equals: ["Annat"]
          }
        },
        {
          id: "medications",
          label: "Använder du för närvarande några mediciner?",
          type: "radio",
          options: ["Ja", "Nej"],
          required: true
        },
        {
          id: "medications_list",
          label: "Lista dina mediciner",
          type: "text",
          required: false,
          show_if: {
            question: "medications",
            equals: "Ja"
          }
        }
      ]
    },
    {
      section_title: "Synhistorik",
      questions: [
        {
          id: "vision_problems",
          label: "Vilka synproblem upplever du?",
          type: "checkbox",
          options: [
            "Närsynthet",
            "Långsynthet",
            "Astigmatism",
            "Ålderssynthet",
            "Annat"
          ],
          required: true
        },
        {
          id: "vision_problems_other",
          label: "Om annat, vänligen specificera",
          type: "text",
          required: false,
          show_if: {
            question: "vision_problems",
            equals: ["Annat"]
          }
        },
        {
          id: "last_eye_exam",
          label: "När var din senaste synundersökning?",
          type: "dropdown",
          options: [
            "Mindre än 1 år sedan",
            "1-2 år sedan",
            "2-5 år sedan",
            "Mer än 5 år sedan",
            "Aldrig"
          ],
          required: true
        },
        {
          id: "current_glasses",
          label: "Använder du glasögon eller kontaktlinser?",
          type: "radio",
          options: ["Glasögon", "Kontaktlinser", "Både och", "Ingen"],
          required: true
        }
      ]
    },
    {
      section_title: "Familjehistorik",
      show_if: {
        question: "existing_conditions",
        equals: ["Glaukom", "Katarakt"]
      },
      questions: [
        {
          id: "family_eye_conditions",
          label: "Finns det någon ögonsjukdom i din familjehistorik?",
          type: "checkbox",
          options: [
            "Glaukom",
            "Katarakt",
            "Makuladegeneration",
            "Annat",
            "Nej"
          ],
          required: true
        },
        {
          id: "family_relationship",
          label: "Om ja, vilken relation?",
          type: "checkbox",
          options: [
            "Förälder",
            "Syskon",
            "Mor/farförälder",
            "Annat"
          ],
          show_if: {
            question: "family_eye_conditions",
            equals: ["Glaukom", "Katarakt", "Makuladegeneration", "Annat"]
          },
          required: false
        }
      ]
    }
  ]
};

/**
 * Example of a minimal form template with only required fields
 */
export const MinimalFormTemplateExample: FormTemplate = {
  title: "Enkelt formulär",
  sections: [
    {
      section_title: "Grundinformation",
      questions: [
        {
          id: "fullname",
          label: "Namn",
          type: "text",
          required: true
        },
        {
          id: "reason_for_visit",
          label: "Anledning till besök",
          type: "text",
          required: true
        }
      ]
    }
  ]
};
