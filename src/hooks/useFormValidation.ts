
/**
 * This hook provides validation for anamnesis forms.
 * It generates a Zod schema based on the form template and validates form inputs against it.
 * It dynamically adapts validation rules based on form visibility conditions to prevent
 * validation of hidden fields.
 */

import { useState, useEffect, useMemo } from 'react';
import { z } from 'zod';
import { FormTemplate, FormSection, FormQuestion } from '@/types/anamnesis';

export function useFormValidation(
  formTemplate: FormTemplate | null,
  initialValues: Record<string, any> | null = null,
  currentValues?: Record<string, any>,
  visibleFieldIds?: string[]
) {
  // Create a Zod schema for validation based on the form template and visible fields
  const validationSchema = useMemo(() => {
    if (!formTemplate) {
      return z.object({});
    }

    // Start with an empty schema
    const schemaFields: Record<string, z.ZodTypeAny> = {};

    // Process each section and question to build the schema
    formTemplate.sections.forEach((section: FormSection) => {
      // Skip sections that have conditional logic that isn't met
      if (section.show_if && currentValues) {
        const { question, equals, contains } = section.show_if;
        const value = currentValues[question];
        
        // Skip this section if its condition is not met
        if (contains !== undefined) {
          if (Array.isArray(value) && !value.includes(contains)) return;
          if (!Array.isArray(value) && value !== contains) return;
        } else if (equals !== undefined) {
          if (Array.isArray(equals) && !equals.includes(value)) return;
          if (!Array.isArray(equals) && value !== equals) return;
        } else if (!value) {
          return;
        }
      }
      
      section.questions.forEach((question: FormQuestion) => {
        // Skip followup templates - they're not rendered directly
        if (question.is_followup_template) return;
        
        // Skip questions that have conditional logic that isn't met
        if (question.show_if && currentValues) {
          const { question: dependentQuestion, equals, contains } = question.show_if;
          const dependentValue = currentValues[dependentQuestion];
          
          // Skip this question if its condition is not met
          if (contains !== undefined) {
            if (Array.isArray(dependentValue) && !dependentValue.includes(contains)) return;
            if (!Array.isArray(dependentValue) && dependentValue !== contains) return;
          } else if (equals !== undefined) {
            if (Array.isArray(equals) && !equals.includes(dependentValue)) return;
            if (!Array.isArray(equals) && dependentValue !== equals) return;
          } else if (!dependentValue) {
            return;
          }
        }
        
        // If we have an explicit list of visible fields, only include those
        const questionId = question.id;
        if (visibleFieldIds && !visibleFieldIds.includes(questionId)) {
          return;
        }

        // Default validation - accept any value
        let fieldSchema: z.ZodTypeAny = z.any();

        // Add required validation if needed
        if (question.required) {
          // Handle different types of fields
          switch (question.type) {
            case 'text':
              fieldSchema = z.string().min(1, { message: 'Detta fält är obligatoriskt' });
              break;
            case 'number':
              fieldSchema = z.number({ 
                required_error: 'Detta fält är obligatoriskt',
                invalid_type_error: 'Måste vara ett nummer'
              });
              break;
            case 'radio':
            case 'select':
            case 'dropdown':
              fieldSchema = z.string({ required_error: 'Detta fält är obligatoriskt' });
              break;
            case 'checkbox':
              fieldSchema = z.array(z.string()).min(1, { message: 'Välj minst ett alternativ' });
              break;
            default:
              fieldSchema = z.any();
          }
        } else {
          // Optional fields
          switch (question.type) {
            case 'text':
              fieldSchema = z.string().optional();
              break;
            case 'number':
              fieldSchema = z.number().optional();
              break;
            case 'radio':
            case 'select':
            case 'dropdown':
              fieldSchema = z.string().optional();
              break;
            case 'checkbox':
              fieldSchema = z.array(z.string()).optional();
              break;
            default:
              fieldSchema = z.any();
          }
        }

        // Add the field to the schema
        schemaFields[questionId] = fieldSchema;
      });
    });

    // Handle dynamic follow-up questions based on current values
    if (currentValues) {
      Object.keys(currentValues).forEach(key => {
        // Look for keys that match the dynamic follow-up question pattern
        if (key.includes('_for_')) {
          // Only add validation if this dynamic field is actually visible
          if (!visibleFieldIds || visibleFieldIds.includes(key)) {
            // Extract the original question ID and parent answer
            const [originalId, parentValue] = key.split('_for_');
            const isRequired = formTemplate.sections.some(section => {
              return section.questions.some(q => 
                q.id === originalId && 
                q.is_followup_template && 
                q.required
              );
            });

            // Create appropriate schema for this dynamic field
            if (isRequired) {
              schemaFields[key] = z.string().min(1, { message: 'Detta fält är obligatoriskt' });
            } else {
              schemaFields[key] = z.string().optional();
            }
          }
        }
      });
    }

    return z.object(schemaFields);
  }, [formTemplate, initialValues, currentValues, visibleFieldIds]);

  // Generate default values based on the form template and any initial values
  const defaultValues = useMemo(() => {
    if (!formTemplate) return {};
    
    const defaults: Record<string, any> = {};
    
    // If we have initial values, use them
    if (initialValues) {
      return initialValues;
    }
    
    // Otherwise, generate defaults based on question types
    formTemplate.sections.forEach((section) => {
      section.questions.forEach((question) => {
        // Skip followup templates
        if (question.is_followup_template) return;
        
        // Set appropriate default value based on question type
        switch (question.type) {
          case 'checkbox':
            defaults[question.id] = [];
            break;
          case 'number':
            defaults[question.id] = null; // Use null for numbers to avoid validation errors
            break;
          default:
            defaults[question.id] = '';
        }
      });
    });
    
    return defaults;
  }, [formTemplate, initialValues]);

  // Utility function to get fields to validate for specific sections
  const getFieldsToValidate = (sections: any[]) => {
    if (!sections) return [];
    
    return sections.flatMap((section: any) => {
      if (!section.questions) return [];
      return section.questions
        .filter(q => !q.is_followup_template)
        .map((q: any) => q.id || q.runtimeId);
    });
  };
  
  // New function to check if a field should be validated based on visibility
  const shouldValidateField = (fieldId: string): boolean => {
    if (!visibleFieldIds) return true;
    return visibleFieldIds.includes(fieldId);
  };
  
  // Log validation schema for debugging
  useEffect(() => {
    if (Object.keys(validationSchema.shape).length > 0) {
      console.log(`[useFormValidation]: Created schema with ${Object.keys(validationSchema.shape).length} fields`);
    }
  }, [validationSchema]);

  return {
    validationSchema,
    defaultValues,
    getFieldsToValidate,
    shouldValidateField
  };
}
