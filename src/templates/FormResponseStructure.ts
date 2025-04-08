
/**
 * This file serves as a reference template for the JSON structure of form responses.
 * It is not meant to be imported directly in code, but rather to be used as documentation
 * and a template when working with form submission data or understanding the response format.
 * 
 * The template provides examples of how answers are structured when submitted by patients
 * or opticians, including the metadata and various answer types.
 */

import { FormattedAnswer } from "@/utils/formSubmissionUtils";

/**
 * Example of a complete form submission with answers for all question types
 */
export const CompleteFormResponseExample = {
  // Formatted answers using the current structure (v2.0)
  formattedAnswers: {
    formTitle: "Patientformulär",
    submissionTimestamp: "2025-04-08T14:25:30.000Z",
    answeredSections: [
      {
        section_title: "Personuppgifter",
        responses: [
          {
            id: "name",
            answer: "Anna Andersson"
          },
          {
            id: "birthdate",
            answer: "1985-03-15"
          },
          {
            id: "phone",
            answer: "070-123 45 67"
          },
          {
            id: "email",
            answer: "anna.andersson@example.com"
          }
        ]
      },
      {
        section_title: "Medicinsk historia",
        responses: [
          {
            id: "existing_conditions",
            answer: ["Högt blodtryck", "Annat"]
          },
          {
            id: "existing_conditions_other",
            answer: "Migrän"
          },
          {
            id: "medications",
            answer: "Ja"
          },
          {
            id: "medications_list",
            answer: "Candesartan 8mg, Sumatriptan 50mg"
          }
        ]
      },
      {
        section_title: "Synhistorik",
        responses: [
          {
            id: "vision_problems",
            answer: ["Närsynthet", "Astigmatism"]
          },
          {
            id: "last_eye_exam",
            answer: "1-2 år sedan"
          },
          {
            id: "current_glasses",
            answer: "Glasögon"
          }
        ]
      }
    ]
  },
  
  // Raw answers in key-value format (preserved for backward compatibility)
  rawAnswers: {
    name: "Anna Andersson",
    birthdate: "1985-03-15",
    phone: "070-123 45 67",
    email: "anna.andersson@example.com",
    existing_conditions: ["Högt blodtryck", "Annat"],
    existing_conditions_other: "Migrän",
    medications: "Ja",
    medications_list: "Candesartan 8mg, Sumatriptan 50mg",
    vision_problems: ["Närsynthet", "Astigmatism"],
    last_eye_exam: "1-2 år sedan",
    current_glasses: "Glasögon"
  },
  
  // Metadata about the submission
  metadata: {
    formTemplateId: "Patientformulär",
    submittedAt: "2025-04-08T14:25:30.000Z",
    version: "2.0",
    submittedBy: "patient" // Indicates submission by patient
  }
};

/**
 * Example of a form response where an optician has filled out the form
 * with the additional "Övrigt" comments for each section
 */
export const OpticianFormResponseExample = {
  // Formatted answers with optician comments
  formattedAnswers: {
    formTitle: "Patientformulär",
    submissionTimestamp: "2025-04-08T15:10:45.000Z",
    answeredSections: [
      {
        section_title: "Personuppgifter",
        responses: [
          {
            id: "name",
            answer: "Peter Pettersson"
          },
          {
            id: "birthdate",
            answer: "1970-08-22"
          },
          {
            id: "phone",
            answer: "073-987 65 43"
          },
          {
            id: "email",
            answer: "peter.pettersson@example.com"
          },
          {
            id: "personuppgifter_optician_notes",
            answer: "Patienten kom utan ID-handling. Bekräftade identitet genom tidigare besök."
          }
        ]
      },
      {
        section_title: "Medicinsk historia",
        responses: [
          {
            id: "existing_conditions",
            answer: ["Diabetes"]
          },
          {
            id: "medications",
            answer: "Ja"
          },
          {
            id: "medications_list",
            answer: "Metformin"
          },
          {
            id: "medicinsk_historia_optician_notes",
            answer: "Patienten nämner att diabetes är väl kontrollerad med HbA1c på 42 mmol/mol vid senaste kontrollen."
          }
        ]
      },
      {
        section_title: "Synhistorik",
        responses: [
          {
            id: "vision_problems",
            answer: ["Långsynthet"]
          },
          {
            id: "last_eye_exam",
            answer: "2-5 år sedan"
          },
          {
            id: "current_glasses",
            answer: "Glasögon"
          },
          {
            id: "synhistorik_optician_notes",
            answer: "Patienten rapporterar ökade problem med läsning på nära håll under kvällstid."
          }
        ]
      }
    ]
  },
  
  // Raw answers in key-value format
  rawAnswers: {
    name: "Peter Pettersson",
    birthdate: "1970-08-22",
    phone: "073-987 65 43",
    email: "peter.pettersson@example.com",
    existing_conditions: ["Diabetes"],
    medications: "Ja",
    medications_list: "Metformin",
    vision_problems: ["Långsynthet"],
    last_eye_exam: "2-5 år sedan",
    current_glasses: "Glasögon",
    personuppgifter_optician_notes: "Patienten kom utan ID-handling. Bekräftade identitet genom tidigare besök.",
    medicinsk_historia_optician_notes: "Patienten nämner att diabetes är väl kontrollerad med HbA1c på 42 mmol/mol vid senaste kontrollen.",
    synhistorik_optician_notes: "Patienten rapporterar ökade problem med läsning på nära håll under kvällstid."
  },
  
  // Metadata about the submission
  metadata: {
    formTemplateId: "Patientformulär",
    submittedAt: "2025-04-08T15:10:45.000Z",
    version: "2.0",
    submittedBy: "optician", // Indicates submission by optician
    opticianId: "opt_123456789",
    organizationId: "org_987654321",
    status: "reviewed" // Automatically mark as reviewed when optician fills it
  }
};

/**
 * Helper type to enforce the structure of an optician note field
 */
export type OpticianNote = {
  id: string; // Format: {section_id}_optician_notes
  answer: string;
};

/**
 * Example structure for a minimal valid form response
 */
export const MinimalFormResponseExample: FormattedAnswer = {
  formTitle: "Enkelt formulär",
  submissionTimestamp: "2025-04-08T12:00:00.000Z",
  answeredSections: [
    {
      section_title: "Grundinformation",
      responses: [
        {
          id: "fullname",
          answer: "Erik Eriksson"
        },
        {
          id: "reason_for_visit",
          answer: "Synundersökning för körkortstillstånd"
        }
      ]
    }
  ]
};
