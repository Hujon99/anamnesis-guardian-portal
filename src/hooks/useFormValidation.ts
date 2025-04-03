
/**
 * This hook handles form validation logic for multi-section forms.
 * It creates dynamic validation schemas based on visible questions and
 * provides functions for validating specific fields or sections.
 */

import { useCallback, useMemo } from "react";
import { z } from "zod";
import { FormTemplate } from "@/types/anamnesis";

export function useFormValidation(formTemplate: FormTemplate, currentValues: Record<string, any>) {
  // Create a dynamic validation schema based on visible questions
  const validationSchema = useMemo(() => {
    const schemaMap: Record<string, any> = {};
    
    formTemplate.sections.forEach(section => {
      // Skip sections that are conditional and condition is not met
      if (section.show_if) {
        const { question, equals } = section.show_if;
        const dependentValue = currentValues[question];
        
        let shouldShow = false;
        if (Array.isArray(equals)) {
          shouldShow = equals.includes(dependentValue);
        } else {
          shouldShow = dependentValue === equals;
        }
        
        if (!shouldShow) return;
      }
      
      section.questions.forEach(question => {
        // Skip questions that are conditional and condition is not met
        if (question.show_if) {
          const { question: dependentQuestionId, equals } = question.show_if;
          const dependentValue = currentValues[dependentQuestionId];
          
          let shouldShow = false;
          if (Array.isArray(equals)) {
            shouldShow = equals.includes(dependentValue);
          } else {
            shouldShow = dependentValue === equals;
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
              schemaMap[question.id] = z.boolean().refine(val => val, { message: "Detta måste kryssas i" });
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
              schemaMap[question.id] = z.boolean().optional();
              break;
            default:
              schemaMap[question.id] = z.string().optional();
          }
        }
      });
    });
    
    return Object.keys(schemaMap).length > 0 ? z.object(schemaMap) : null;
  }, [formTemplate, currentValues]);

  // Function to get all field IDs that should be validated in a specific section
  const getFieldsToValidate = useCallback((sections: Array<any>): string[] => {
    const fieldsToValidate: string[] = [];
    
    sections.forEach(section => {
      section.questions.forEach(question => {
        // Skip questions that shouldn't be shown
        if (question.show_if) {
          const { question: dependentQuestionId, equals } = question.show_if;
          const dependentValue = currentValues[dependentQuestionId];
          
          let shouldShow = false;
          if (Array.isArray(equals)) {
            shouldShow = equals.includes(dependentValue);
          } else {
            shouldShow = dependentValue === equals;
          }
          
          if (!shouldShow) return;
        }
        
        if (question.required) {
          fieldsToValidate.push(question.id);
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
