
/**
 * This hook handles conditional display logic for form sections and questions.
 * It determines which sections and questions should be displayed based on the
 * current form values and conditional rules.
 */

import { useEffect, useState, useMemo } from "react";
import { FormTemplate, FormSection, FormQuestion } from "@/types/anamnesis";

export function useConditionalFields(formTemplate: FormTemplate, currentValues: Record<string, any>) {
  const [visibleSections, setVisibleSections] = useState<Array<Array<any>>>([]);
  
  // Determine which sections should be visible based on form values
  useEffect(() => {
    const filteredSections = formTemplate.sections.filter(section => {
      if (!section.show_if) return true;
      
      const { question, equals } = section.show_if;
      const dependentValue = currentValues[question];
      
      let shouldShow = false;
      if (Array.isArray(equals)) {
        shouldShow = equals.includes(dependentValue);
      } else {
        shouldShow = dependentValue === equals;
      }
      
      console.log(`Section "${section.section_title}" condition:`, 
        shouldShow ? "VISIBLE" : "HIDDEN", 
        `(depends on ${question}=${JSON.stringify(equals)}, actual value=${dependentValue})`
      );
      
      return shouldShow;
    });
    
    // Log all visible sections
    console.log(`Visible sections: ${filteredSections.length} of ${formTemplate.sections.length}`);
    filteredSections.forEach(section => {
      console.log(`- Section: "${section.section_title}"`);
    });
    
    // Simple approach: each section is its own step
    setVisibleSections(filteredSections.map(section => [section]));
  }, [formTemplate, currentValues]);
  
  // Check if a specific question should be visible
  const shouldShowQuestion = useMemo(() => (question: FormQuestion) => {
    if (!question.show_if) return true;
    
    const { question: dependentQuestionId, equals } = question.show_if;
    const dependentValue = currentValues[dependentQuestionId];
    
    let shouldShow = false;
    if (Array.isArray(equals)) {
      shouldShow = equals.includes(dependentValue);
    } else {
      shouldShow = dependentValue === equals;
    }
    
    // Add to debug console with full details
    if (question.show_if) {
      console.log(`Question "${question.label}" (${question.id}) condition:`, 
        shouldShow ? "VISIBLE" : "HIDDEN", 
        `(depends on ${dependentQuestionId}=${JSON.stringify(equals)}, actual value=${dependentValue})`
      );
    }
    
    return shouldShow;
  }, [currentValues]);
  
  // Check if a specific section should be visible
  const shouldShowSection = useMemo(() => (section: FormSection) => {
    if (!section.show_if) return true;
    
    const { question, equals } = section.show_if;
    const dependentValue = currentValues[question];
    
    let shouldShow = false;
    if (Array.isArray(equals)) {
      shouldShow = equals.includes(dependentValue);
    } else {
      shouldShow = dependentValue === equals;
    }
    
    return shouldShow;
  }, [currentValues]);
  
  return {
    visibleSections,
    shouldShowQuestion,
    shouldShowSection,
    totalSections: visibleSections.length
  };
}
