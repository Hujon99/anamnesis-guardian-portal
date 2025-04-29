/**
 * This hook provides validation for anamnesis forms.
 * It generates a Zod schema based on the form template and validates form inputs against it.
 * It also generates default values for the form based on the form template.
 */

import { useState, useEffect, useMemo } from 'react';
import { z } from 'zod';
import { FormTemplate, FormSection, FormQuestion } from '@/types/anamnesis';

export function useFormValidation(
  formTemplate: FormTemplate | null,
  initialValues: Record<string, any> | null = null
) {
  // Create a Zod schema for validation based on the form template
  const validationSchema = useMemo(() => {
    if (!formTemplate) {
      return z.object({});
    }

    // Start with an empty schema
    const schemaFields: Record<string, z.ZodTypeAny> = {};

    // Process each section and question to build the schema
    formTemplate.sections.forEach((section: FormSection) => {
      section.questions.forEach((question: FormQuestion) => {
        // Skip followup templates - they're not rendered directly
        if (question.is_followup_template) return;

        // Default validation - accept any value
        let fieldSchema = z.any();

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
        schemaFields[question.id] = fieldSchema;
      });
    });

    return z.object(schemaFields);
  }, [formTemplate]);

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
      return section.questions.map((q: any) => q.id || q.runtimeId);
    });
  };

  return {
    validationSchema,
    defaultValues,
    getFieldsToValidate
  };
}
