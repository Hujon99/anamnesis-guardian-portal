
/**
 * This file serves as a reference template for the structure of form templates.
 * It provides a standardized schema that can be used when creating new form templates
 * or understanding the existing structure. This file is not meant to be imported directly
 * into code but rather serves as documentation.
 */

import { FormTemplate } from "@/types/anamnesis";

// Example form template structure with comments
const formTemplateStructure: FormTemplate = {
  title: "Patientanamnes",
  sections: [
    {
      section_title: "Personlig information",
      questions: [
        {
          id: "patient_name",
          label: "Namn",
          type: "text",
          required: true
        },
        {
          id: "patient_email",
          label: "E-postadress",
          type: "text",
          required: true
        },
        {
          id: "patient_phone",
          label: "Telefonnummer",
          type: "text",
          required: false
        },
        {
          id: "personlig_info_optiker_ovrigt",
          label: "Övrigt (Synlig bara för optiker)",
          type: "text",
          required: false,
          show_in_mode: "optician"
        }
      ]
    },
    {
      section_title: "Synhistorik",
      questions: [
        {
          id: "vision_history",
          label: "Har du märkt några förändringar i din syn nyligen?",
          type: "radio",
          options: ["Ja", "Nej"],
          required: true
        },
        {
          id: "vision_changes",
          label: "Om ja, beskriv förändringarna",
          type: "text",
          required: false,
          show_if: {
            question: "vision_history",
            equals: "Ja"
          }
        },
        {
          id: "glasses_history",
          label: "Använder du glasögon eller kontaktlinser?",
          type: "radio",
          options: ["Glasögon", "Kontaktlinser", "Båda", "Ingen"],
          required: true
        },
        {
          id: "synhistorik_optiker_ovrigt",
          label: "Övrigt (Synlig bara för optiker)",
          type: "text",
          required: false,
          show_in_mode: "optician"
        }
      ]
    },
    {
      section_title: "Medicinsk historik",
      questions: [
        {
          id: "eye_conditions",
          label: "Har du någon av följande ögontillstånd?",
          type: "checkbox",
          options: ["Grå starr", "Glaukom", "Makuladegeneration", "Torra ögon", "Annat", "Inga"],
          required: true
        },
        {
          id: "family_eye_history",
          label: "Finns det någon ögonsjukdom i din familj?",
          type: "radio",
          options: ["Ja", "Nej", "Vet ej"],
          required: true
        },
        {
          id: "general_health",
          label: "Har du några andra hälsotillstånd?",
          type: "checkbox",
          options: ["Diabetes", "Högt blodtryck", "Sköldkörtelproblem", "Annat", "Inga"],
          required: true
        },
        {
          id: "medicinsk_historik_optiker_ovrigt",
          label: "Övrigt (Synlig bara för optiker)",
          type: "text",
          required: false,
          show_in_mode: "optician"
        }
      ]
    }
  ]
};

export default formTemplateStructure;
