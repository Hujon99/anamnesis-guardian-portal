
/**
 * This hook handles conditional display logic for form sections and questions.
 * It determines which sections and questions should be displayed based on the
 * current form values and conditional rules.
 */

import { useEffect, useState, useMemo } from "react";
import { FormTemplate } from "@/types/anamnesis";

export function useConditionalFields(formTemplate: FormTemplate, currentValues: Record<string, any>) {
  const [visibleSections, setVisibleSections] = useState<Array<Array<any>>>([]);
  
  // Determine which sections should be visible based on form values
  useEffect(() => {
    const filteredSections = formTemplate.sections.filter(section => {
      if (!section.show_if) return true;
      
      const { question, equals } = section.show_if;
      const dependentValue = currentValues[question];
      
      if (Array.isArray(equals)) {
        return equals.includes(dependentValue);
      }
      
      return dependentValue === equals;
    });
    
    // Simple approach: each section is its own step
    setVisibleSections(filteredSections.map(section => [section]));
  }, [formTemplate, currentValues]);
  
  // Check if a specific question should be visible
  const shouldShowQuestion = useMemo(() => (question: any) => {
    if (!question.show_if) return true;
    
    const { question: dependentQuestionId, equals } = question.show_if;
    const dependentValue = currentValues[dependentQuestionId];
    
    if (Array.isArray(equals)) {
      return equals.includes(dependentValue);
    }
    
    return dependentValue === equals;
  }, [currentValues]);
  
  // Check if a specific section should be visible
  const shouldShowSection = useMemo(() => (section: any) => {
    if (!section.show_if) return true;
    
    const { question, equals } = section.show_if;
    const dependentValue = currentValues[question];
    
    if (Array.isArray(equals)) {
      return equals.includes(dependentValue);
    }
    
    return dependentValue === equals;
  }, [currentValues]);
  
  return {
    visibleSections,
    shouldShowQuestion,
    shouldShowSection,
    totalSections: visibleSections.length
  };
}
