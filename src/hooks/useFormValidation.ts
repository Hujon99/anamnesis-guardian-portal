
/**
 * This hook handles form validation logic for multi-section forms.
 * It creates dynamic validation schemas based on visible questions and
 * provides functions for validating specific fields or sections.
 * Now supports checkbox arrays and dynamic follow-up questions.
 */

import { useCallback, useMemo } from "react";
import { z } from "zod";
import { FormTemplate, DynamicFollowupQuestion } from "@/types/anamnesis";

export function useFormValidation(formTemplate: FormTemplate, currentValues: Record<string, any>) {
  // Helper function to recursively process the template for validation
  // Define this function before it's used in validationSchema
  const processTemplateForValidation = (
    template: FormTemplate,
    values: Record<string, any>,
    schemaMap: Record<string, any>
  ) => {
    template.sections.forEach(section => {
      // Skip sections that are conditional and condition is not met
      if (section.show_if) {
        const { question, equals, contains } = section.show_if;
        const dependentValue = values[question];
        
        let shouldShow = false;
        if (contains !== undefined) {
          // For array values (checkboxes)
          if (Array.isArray(dependentValue)) {
            shouldShow = dependentValue.includes(contains);
          } else {
            shouldShow = dependentValue === contains;
          }
        } else if (equals !== undefined) {
          if (Array.isArray(equals)) {
            shouldShow = equals.includes(dependentValue);
          } else {
            shouldShow = dependentValue === equals;
          }
        } else {
          shouldShow = !!dependentValue;
        }
        
        if (!shouldShow) return;
      }
      
      section.questions.forEach(question => {
        // Skip follow-up templates - they'll be validated as dynamic instances
        if (question.is_followup_template) return;
        
        // Skip questions that are conditional and condition is not met
        if (question.show_if) {
          const { question: dependentQuestionId, equals, contains } = question.show_if;
          const dependentValue = values[dependentQuestionId];
          
          let shouldShow = false;
          if (contains !== undefined) {
            // For array values (checkboxes)
            if (Array.isArray(dependentValue)) {
              shouldShow = dependentValue.includes(contains);
            } else {
              shouldShow = dependentValue === contains;
            }
          } else if (equals !== undefined) {
            if (Array.isArray(equals)) {
              shouldShow = equals.includes(dependentValue);
            } else {
              shouldShow = dependentValue === equals;
            }
          } else {
            shouldShow = !!dependentValue;
          }
          
          if (!shouldShow) return;
        }
        
        // Add validation rule based on question type and required flag
        if (question.required) {
          switch (question.type) {
            case "text":
              schemaMap[question.id] = z.string().min(1, { message: "Detta fält måste fyllas i" });
              break;
            case "number":
              schemaMap[question.id] = z.number().or(z.string().min(1, { message: "Detta fält måste fyllas i" }));
              break;
            case "radio":
            case "dropdown":
              schemaMap[question.id] = z.string().min(1, { message: "Du måste välja ett alternativ" });
              break;
            case "checkbox":
              // For multi-select checkboxes
              if (question.options && question.options.length > 0) {
                schemaMap[question.id] = z.array(z.string()).min(1, { message: "Du måste välja minst ett alternativ" });
              } else {
                // For boolean checkboxes
                schemaMap[question.id] = z.boolean().refine(val => val, { message: "Detta måste kryssas i" });
              }
              break;
            default:
              schemaMap[question.id] = z.string().min(1, { message: "Detta fält måste fyllas i" });
          }
        } else {
          // Not required fields
          switch (question.type) {
            case "number":
              schemaMap[question.id] = z.number().or(z.string()).optional();
              break;
            case "checkbox":
              // For multi-select checkboxes
              if (question.options && question.options.length > 0) {
                schemaMap[question.id] = z.array(z.string()).optional();
              } else {
                // For boolean checkboxes
                schemaMap[question.id] = z.boolean().optional();
              }
              break;
            default:
              schemaMap[question.id] = z.string().optional();
          }
        }
      });
    });
  };

  // Create a dynamic validation schema based on visible questions
  const validationSchema = useMemo(() => {
    const schemaMap: Record<string, any> = {};
    
    // Validate regular template fields first
    processTemplateForValidation(formTemplate, currentValues, schemaMap);
    
    // Check for dynamic follow-up fields and validate them
    Object.keys(currentValues).forEach(key => {
      // Check if this is a runtime ID for a dynamic field (format: originalId_for_value)
      if (key.includes('_for_')) {
        const [originalId] = key.split('_for_');
        
        // Find the original question in the template to get its validation rules
        let originalQuestion: any = null;
        
        formTemplate.sections.forEach(section => {
          section.questions.forEach(question => {
            if (question.id === originalId) {
              originalQuestion = question;
            }
          });
        });
        
        // If we found the original question, apply its validation rules to the dynamic instance
        if (originalQuestion) {
          if (originalQuestion.required) {
            switch (originalQuestion.type) {
              case "text":
                schemaMap[key] = z.string().min(1, { message: "Detta fält måste fyllas i" });
                break;
              case "number":
                schemaMap[key] = z.number().or(z.string().min(1, { message: "Detta fält måste fyllas i" }));
                break;
              case "radio":
              case "dropdown":
                schemaMap[key] = z.string().min(1, { message: "Du måste välja ett alternativ" });
                break;
              case "checkbox":
                // For multi-select checkboxes
                if (originalQuestion.options && originalQuestion.options.length > 0) {
                  schemaMap[key] = z.array(z.string()).min(1, { message: "Du måste välja minst ett alternativ" });
                } else {
                  // For boolean checkboxes
                  schemaMap[key] = z.boolean().refine(val => val, { message: "Detta måste kryssas i" });
                }
                break;
              default:
                schemaMap[key] = z.string().min(1, { message: "Detta fält måste fyllas i" });
            }
          } else {
            // Not required fields
            switch (originalQuestion.type) {
              case "number":
                schemaMap[key] = z.number().or(z.string()).optional();
                break;
              case "checkbox":
                // For multi-select checkboxes
                if (originalQuestion.options && originalQuestion.options.length > 0) {
                  schemaMap[key] = z.array(z.string()).optional();
                } else {
                  // For boolean checkboxes
                  schemaMap[key] = z.boolean().optional();
                }
                break;
              default:
                schemaMap[key] = z.string().optional();
            }
          }
        }
      }
    });
    
    return Object.keys(schemaMap).length > 0 ? z.object(schemaMap) : null;
  }, [formTemplate, currentValues]);

  // Function to get all field IDs that should be validated in a specific section
  const getFieldsToValidate = useCallback((sections: Array<any>): string[] => {
    const fieldsToValidate: string[] = [];
    
    sections.forEach(section => {
      section.questions.forEach((question: any) => {
        // Get the field ID to validate (could be runtime ID for dynamic questions)
        const fieldId = (question as DynamicFollowupQuestion).runtimeId || question.id;
        
        // Skip questions that shouldn't be shown
        if (question.show_if) {
          const { question: dependentQuestionId, equals, contains } = question.show_if;
          const dependentValue = currentValues[dependentQuestionId];
          
          let shouldShow = false;
          if (contains !== undefined) {
            // For array values (checkboxes)
            if (Array.isArray(dependentValue)) {
              shouldShow = dependentValue.includes(contains);
            } else {
              shouldShow = dependentValue === contains;
            }
          } else if (equals !== undefined) {
            if (Array.isArray(equals)) {
              shouldShow = equals.includes(dependentValue);
            } else {
              shouldShow = dependentValue === equals;
            }
          } else {
            shouldShow = !!dependentValue;
          }
          
          if (!shouldShow) return;
        }
        
        if (question.required) {
          fieldsToValidate.push(fieldId);
        }
      });
    });
    
    return fieldsToValidate;
  }, [currentValues]);

  return {
    validationSchema,
    getFieldsToValidate
  };
}
