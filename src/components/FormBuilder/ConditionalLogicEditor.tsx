/**
 * Conditional Logic Editor Component
 * Visual interface for setting up conditional question display logic.
 * Shows dependencies between questions and allows easy management
 * of show_if conditions throughout the form.
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  GitBranch,
  Plus,
  Trash2,
  AlertTriangle,
  Link,
  Unlink,
  Eye,
  EyeOff
} from 'lucide-react';

import { FormTemplate, FormSection, FormQuestion } from '@/types/anamnesis';

interface ConditionalLogicEditorProps {
  schema: FormTemplate;
  onUpdate: (schema: FormTemplate) => void;
}

interface QuestionRef {
  id: string;
  label: string;
  type: string;
  sectionIndex: number;
  questionIndex: number;
  options?: any[];
}

interface ConditionalRule {
  questionId: string;
  dependsOn: string;
  condition: string;
  value: any;
}

export const ConditionalLogicEditor: React.FC<ConditionalLogicEditorProps> = ({
  schema,
  onUpdate
}) => {
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string>('');

  // Get all questions as flat list with references
  const allQuestions = useMemo((): QuestionRef[] => {
    const questions: QuestionRef[] = [];
    
    schema.sections?.forEach((section, sectionIndex) => {
      section.questions.forEach((question, questionIndex) => {
        questions.push({
          id: question.id,
          label: question.label,
          type: question.type,
          sectionIndex,
          questionIndex,
          options: question.options
        });
      });
    });
    
    return questions;
  }, [schema.sections]);

  // Get conditional rules
  const conditionalRules = useMemo((): ConditionalRule[] => {
    const rules: ConditionalRule[] = [];
    
    allQuestions.forEach(question => {
      const fullQuestion = schema.sections?.[question.sectionIndex]?.questions[question.questionIndex];
      if (fullQuestion?.show_if) {
        // Handle both 'equals' and 'contains' conditions
        if (fullQuestion.show_if.equals !== undefined) {
          rules.push({
            questionId: question.id,
            dependsOn: fullQuestion.show_if.question,
            condition: 'equals',
            value: fullQuestion.show_if.equals
          });
        } else if (fullQuestion.show_if.contains !== undefined) {
          rules.push({
            questionId: question.id,
            dependsOn: fullQuestion.show_if.question,
            condition: 'contains',
            value: fullQuestion.show_if.contains
          });
        }
      }
    });
    
    return rules;
  }, [allQuestions, schema.sections]);

  // Update a question's conditional logic
  const updateQuestionCondition = (questionId: string, dependsOn?: string, value?: any, condition: string = 'equals') => {
    const updatedSections = schema.sections?.map(section => ({
      ...section,
      questions: section.questions.map(question => {
        if (question.id === questionId) {
          if (dependsOn && value !== undefined) {
            return {
              ...question,
              show_if: {
                question: dependsOn,
                ...(condition === 'contains' ? { contains: value } : { equals: value })
              }
            };
          } else {
            // Remove condition
            const { show_if, ...questionWithoutCondition } = question;
            return questionWithoutCondition;
          }
        }
        return question;
      })
    }));

    onUpdate({
      ...schema,
      sections: updatedSections || []
    });
  };

  // Add new conditional rule
  const addConditionalRule = (questionId: string, dependsOn: string, value: any, condition: string = 'equals') => {
    updateQuestionCondition(questionId, dependsOn, value, condition);
  };

  // Remove conditional rule
  const removeConditionalRule = (questionId: string) => {
    updateQuestionCondition(questionId);
  };

  // Get possible values for a question (for conditions)
  const getPossibleValues = (questionId: string): string[] => {
    const question = allQuestions.find(q => q.id === questionId);
    if (!question) return [];

    switch (question.type) {
      case 'radio':
      case 'dropdown':
        return question.options?.map(opt => 
          typeof opt === 'string' ? opt : opt.value || ''
        ) || [];
      case 'checkbox':
        return ['true', 'false'];
      default:
        return [];
    }
  };

  // Check for cyclical dependencies
  const checkCyclicalDependency = (questionId: string, dependsOn: string): boolean => {
    const visited = new Set<string>();
    const stack = [dependsOn];
    
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === questionId) return true;
      if (visited.has(current)) continue;
      
      visited.add(current);
      const currentRules = conditionalRules.filter(rule => rule.questionId === current);
      currentRules.forEach(rule => stack.push(rule.dependsOn));
    }
    
    return false;
  };

  // Get questions that can be used as dependencies (questions that appear before the current one)
  const getAvailableDependencies = (questionId: string): QuestionRef[] => {
    const currentQuestionIndex = allQuestions.findIndex(q => q.id === questionId);
    if (currentQuestionIndex === -1) return [];
    
    return allQuestions.slice(0, currentQuestionIndex).filter(q => 
      ['radio', 'dropdown', 'checkbox'].includes(q.type)
    );
  };

  if (!schema.sections || schema.sections.length === 0) {
    return (
      <div className="p-8 text-center">
        <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Ingen villkorlig logik</h3>
        <p className="text-muted-foreground">
          Lägg till frågor i formuläret för att skapa villkorlig logik
        </p>
      </div>
    );
  }

  const questionsWithConditions = allQuestions.filter(q => 
    conditionalRules.some(rule => rule.questionId === q.id)
  );

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Villkorlig logik
            </h3>
            <p className="text-sm text-muted-foreground">
              Hantera när frågor ska visas baserat på andra svar
            </p>
          </div>
          
          <Badge variant="secondary">
            {conditionalRules.length} regler
          </Badge>
        </div>

        {/* Current conditional rules */}
        {questionsWithConditions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aktiva regler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {questionsWithConditions.map(question => {
                const rule = conditionalRules.find(r => r.questionId === question.id);
                const dependsOnQuestion = allQuestions.find(q => q.id === rule?.dependsOn);
                
                return (
                  <div 
                    key={question.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{question.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {question.id}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Visas om "{dependsOnQuestion?.label}" ({dependsOnQuestion?.id}) {rule?.condition === 'contains' ? 'innehåller' : '='} "{rule?.value}"
                      </p>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRuleToDelete(question.id);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Add new rule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lägg till ny regel</CardTitle>
          </CardHeader>
          <CardContent>
            <NewRuleForm
              allQuestions={allQuestions}
              onAddRule={addConditionalRule}
              getAvailableDependencies={getAvailableDependencies}
              getPossibleValues={getPossibleValues}
              checkCyclicalDependency={checkCyclicalDependency}
            />
          </CardContent>
        </Card>

        {/* Visual flow */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logikflöde</CardTitle>
          </CardHeader>
          <CardContent>
            <LogicFlow
              allQuestions={allQuestions}
              conditionalRules={conditionalRules}
            />
          </CardContent>
        </Card>
        </div>
      </ScrollArea>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort villkorlig regel</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort den villkorliga regeln? 
              Frågan kommer att visas för alla användare.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                removeConditionalRule(ruleToDelete);
                setShowDeleteDialog(false);
                setRuleToDelete('');
              }}
            >
              Ta bort regel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Sub-component for adding new rules
const NewRuleForm: React.FC<{
  allQuestions: QuestionRef[];
  onAddRule: (questionId: string, dependsOn: string, value: any, condition?: string) => void;
  getAvailableDependencies: (questionId: string) => QuestionRef[];
  getPossibleValues: (questionId: string) => string[];
  checkCyclicalDependency: (questionId: string, dependsOn: string) => boolean;
}> = ({ 
  allQuestions, 
  onAddRule, 
  getAvailableDependencies, 
  getPossibleValues,
  checkCyclicalDependency 
}) => {
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [selectedDependency, setSelectedDependency] = useState('');
  const [selectedValue, setSelectedValue] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('equals');
  const [error, setError] = useState('');

  const availableDependencies = selectedQuestion ? getAvailableDependencies(selectedQuestion) : [];
  const possibleValues = selectedDependency ? getPossibleValues(selectedDependency) : [];

  const handleAddRule = () => {
    if (!selectedQuestion || !selectedDependency || !selectedValue) {
      setError('Alla fält måste fyllas i');
      return;
    }

    if (checkCyclicalDependency(selectedQuestion, selectedDependency)) {
      setError('Detta skulle skapa ett cirkulärt beroende');
      return;
    }

    onAddRule(selectedQuestion, selectedDependency, selectedValue, selectedCondition);
    setSelectedQuestion('');
    setSelectedDependency('');
    setSelectedValue('');
    setSelectedCondition('equals');
    setError('');
  };

  const questionsWithoutConditions = allQuestions.filter(q => 
    !q.id.includes('show_if')
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Fråga att visa/dölja</Label>
          <Select value={selectedQuestion} onValueChange={setSelectedQuestion}>
            <SelectTrigger>
              <SelectValue placeholder="Välj fråga..." />
            </SelectTrigger>
            <SelectContent>
              {questionsWithoutConditions.map(question => (
                <SelectItem key={question.id} value={question.id}>
                  <div className="flex items-center gap-2">
                    <span>{question.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {question.id}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Beror på fråga</Label>
          <Select 
            value={selectedDependency} 
            onValueChange={setSelectedDependency}
            disabled={!selectedQuestion}
          >
            <SelectTrigger>
              <SelectValue placeholder="Välj beroende..." />
            </SelectTrigger>
            <SelectContent>
              {availableDependencies.map(question => (
                <SelectItem key={question.id} value={question.id}>
                  <div className="flex items-center gap-2">
                    <span>{question.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {question.id}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Villkor</Label>
          <Select value={selectedCondition} onValueChange={setSelectedCondition}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equals">Är lika med</SelectItem>
              <SelectItem value="contains">Innehåller</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Värde</Label>
          {possibleValues.length > 0 ? (
            <Select value={selectedValue} onValueChange={setSelectedValue}>
              <SelectTrigger>
                <SelectValue placeholder="Välj värde..." />
              </SelectTrigger>
              <SelectContent>
                {possibleValues.map(value => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={selectedValue}
              onChange={(e) => setSelectedValue(e.target.value)}
              placeholder="Ange värde..."
              disabled={!selectedDependency}
            />
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      <Button 
        onClick={handleAddRule}
        disabled={!selectedQuestion || !selectedDependency || !selectedValue}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Lägg till regel
      </Button>
    </div>
  );
};

// Sub-component for visualizing logic flow
const LogicFlow: React.FC<{
  allQuestions: QuestionRef[];
  conditionalRules: ConditionalRule[];
}> = ({ allQuestions, conditionalRules }) => {
  if (conditionalRules.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p>Ingen villkorlig logik definierad ännu</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {conditionalRules.map((rule, index) => {
        const question = allQuestions.find(q => q.id === rule.questionId);
        const dependency = allQuestions.find(q => q.id === rule.dependsOn);
        
        return (
          <div 
            key={index}
            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
          >
            <Badge variant="outline">{dependency?.label}</Badge>
            <span className="text-sm text-muted-foreground">
              {rule.condition === 'contains' ? 'innehåller' : '='}
            </span>
            <Badge variant="secondary">"{rule.value}"</Badge>
            <span className="text-sm text-muted-foreground">→</span>
            <Badge>Visa: {question?.label}</Badge>
          </div>
        );
      })}
    </div>
  );
};