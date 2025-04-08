/**
 * This file serves as a reference template for the JSON structure used to store
 * processed form answers after submission.
 * It is not meant to be imported directly in code, but rather to be used as documentation
 * and a template for understanding the expected output format from the form processing logic.
 *
 * The examples are based on hypothetical user submissions for the 'ConciseFormTemplateExample'.
 */

// Define the interface for the answer structure (can be imported or defined here)
// Assuming the structure agreed upon previously
import { FormattedAnswer } from "@/utils/formSubmissionUtils";

/**
 * Example 1: Patient completes the form, chooses Email, has Blurry Vision.
 * Note how only relevant sections and answered questions are included.
 * Optician-specific fields are NOT included.
 * Conditional fields not met ('contact_preference_övrigt', 'headache_location') are NOT included.
 */
export const FormattedAnswerExamplePatient: FormattedAnswer = {
  // Title from the specific Form Template used
  formTitle: "Concise Example Form",
  // ISO timestamp generated when the answers were processed/saved
  submissionTimestamp: "2025-04-08T12:00:00Z",
  // Array containing ONLY the sections that were shown AND had at least one answered question
  answeredSections: [
    {
      // Title of the section from the template
      section_title: "Basic Information",
      // Array containing ONLY the questions within this section that were shown AND answered
      responses: [
        {
          // ID of the answered question
          id: "full_name",
          // The answer provided
          answer: "Alice Andersson"
        },
        {
          id: "contact_preference",
          answer: "Email" // This answer determines if the next section is shown
        }
        // Note: 'contact_preference_övrigt' is missing because 'Other' was not selected
        // Note: 'internal_notes_basic' is missing because it's optician-only
      ]
    },
    {
      // This section is included because contact_preference was 'Email'
      section_title: "Symptom Details",
      responses: [
        {
          id: "main_symptom",
          answer: "Blurry Vision" // This answer determines if 'headache_location' is shown
        }
        // Note: 'headache_location' is missing because 'Headache' was not selected
        // Note: 'symptom_optician_notes' is missing because it's optician-only
      ]
    }
  ]
};

/**
 * Example 2: Optician completes the form, chooses Other contact, skips symptom details.
 * Note how optician-specific fields ARE included.
 * The conditional section 'Symptom Details' is NOT included because the condition was not met.
 */
export const FormattedAnswerExampleOptician: FormattedAnswer = {
  formTitle: "Concise Example Form",
  submissionTimestamp: "2025-04-08T12:05:00Z",
  answeredSections: [
    {
      section_title: "Basic Information",
      responses: [
        {
          id: "full_name",
          answer: "Bob Bengtsson"
        },
        {
          id: "contact_preference",
          answer: "Other" // This answer means 'Symptom Details' section is skipped
        },
        {
          // The follow-up field IS included because 'Other' was selected
          id: "contact_preference_övrigt",
          answer: "Via secure message portal"
        },
        {
          // The optician-specific field IS included because the mode is assumed to be 'optician'
          id: "internal_notes_basic",
          answer: "Patient seems anxious. Referred by Dr. Smith."
        }
      ]
    }
    // Note: The entire 'Symptom Details' section is missing because its 'show_if' condition
    // (contact_preference == 'Email' or 'Phone') was not met.
  ]
};