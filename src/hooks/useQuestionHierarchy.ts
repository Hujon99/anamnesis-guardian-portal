/**
 * Question Hierarchy Hook
 * Calculates the hierarchical relationships between questions based on conditional logic.
 * Determines parent-child relationships, depth levels, and which questions control others.
 */

import { useMemo } from 'react';
import { FormTemplate, FormQuestion } from '@/types/anamnesis';

export interface QuestionHierarchyInfo {
  questionId: string;
  sectionIndex: number;
  questionIndex: number;
  parentId?: string;
  depth: number;
  childrenIds: string[];
  childrenCount: number;
}

/**
 * Calculates the hierarchical structure of questions in a form
 */
export const useQuestionHierarchy = (schema: FormTemplate) => {
  return useMemo(() => {
    const hierarchyMap = new Map<string, QuestionHierarchyInfo>();
    
    // First pass: Create basic info for all questions
    schema.sections.forEach((section, sectionIndex) => {
      section.questions.forEach((question, questionIndex) => {
        hierarchyMap.set(question.id, {
          questionId: question.id,
          sectionIndex,
          questionIndex,
          parentId: question.show_if?.question,
          depth: 0,
          childrenIds: [],
          childrenCount: 0
        });
      });
    });
    
    // Second pass: Build parent-child relationships
    hierarchyMap.forEach((info) => {
      if (info.parentId) {
        const parent = hierarchyMap.get(info.parentId);
        if (parent) {
          parent.childrenIds.push(info.questionId);
          parent.childrenCount = parent.childrenIds.length;
        }
      }
    });
    
    // Third pass: Calculate depths
    const calculateDepth = (questionId: string, visited = new Set<string>()): number => {
      if (visited.has(questionId)) return 0; // Circular dependency protection
      visited.add(questionId);
      
      const info = hierarchyMap.get(questionId);
      if (!info || !info.parentId) return 0;
      
      return 1 + calculateDepth(info.parentId, visited);
    };
    
    hierarchyMap.forEach((info) => {
      info.depth = calculateDepth(info.questionId);
    });
    
    return hierarchyMap;
  }, [schema]);
};

/**
 * Gets hierarchy info for a specific question
 */
export const getQuestionHierarchy = (
  questionId: string,
  hierarchyMap: Map<string, QuestionHierarchyInfo>
): QuestionHierarchyInfo | undefined => {
  return hierarchyMap.get(questionId);
};

/**
 * Gets all child questions for a given question
 */
export const getChildQuestions = (
  questionId: string,
  hierarchyMap: Map<string, QuestionHierarchyInfo>
): QuestionHierarchyInfo[] => {
  const info = hierarchyMap.get(questionId);
  if (!info) return [];
  
  return info.childrenIds
    .map(id => hierarchyMap.get(id))
    .filter((child): child is QuestionHierarchyInfo => child !== undefined);
};

/**
 * Checks if a question is a parent (has children)
 */
export const isParentQuestion = (
  questionId: string,
  hierarchyMap: Map<string, QuestionHierarchyInfo>
): boolean => {
  const info = hierarchyMap.get(questionId);
  return info ? info.childrenCount > 0 : false;
};

/**
 * Checks if a question is a child (has a parent)
 */
export const isChildQuestion = (
  questionId: string,
  hierarchyMap: Map<string, QuestionHierarchyInfo>
): boolean => {
  const info = hierarchyMap.get(questionId);
  return info ? !!info.parentId : false;
};
