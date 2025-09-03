/**
 * Displays the patient's form answers for driving license examination.
 * Shows a summary of all responses and automatically flags answers 
 * that may require further investigation according to driving license requirements.
 * Uses the form template to display proper question labels in form order.
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, AlertTriangle, CheckCircle, Plus } from "lucide-react";
import { AnamnesesEntry } from "@/types/anamnesis";
import { useFormTemplateByFormId } from "@/hooks/useFormTemplateByFormId";
import { AnswerDisplayHelper } from "@/components/Optician/EntryDetails/AnswerDisplayHelper";

interface FormAnswersDisplayProps {
  entry: AnamnesesEntry;
  onNext: () => void;
}

export const FormAnswersDisplay: React.FC<FormAnswersDisplayProps> = ({
  entry,
  onNext
}) => {
  const answers = entry.answers as Record<string, any> || {};
  const hasAnswers = Object.keys(answers).length > 0;
  
  // Fetch form template to get proper question labels
  const { data: formTemplate, isLoading: isLoadingTemplate } = useFormTemplateByFormId(entry.form_id);
  
  // Create a map of question IDs to labels from the form template
  const questionLabelMap = React.useMemo(() => {
    if (!formTemplate?.schema) return {};
    
    const labelMap: Record<string, string> = {};
    formTemplate.schema.sections.forEach(section => {
      section.questions.forEach(question => {
        labelMap[question.id] = question.label;
      });
    });
    return labelMap;
  }, [formTemplate]);
  
  // Get ordered questions from form template, filtering out empty follow-up questions
  const orderedQuestions = React.useMemo(() => {
    if (!formTemplate?.schema) return [];
    
    const questions: { id: string; label: string; sectionTitle: string; answer: any }[] = [];
    formTemplate.schema.sections.forEach(section => {
      section.questions.forEach(question => {
        if (answers.hasOwnProperty(question.id)) {
          const answer = answers[question.id];
          
          // Check if this is a meaningful answer (not empty, null, undefined, or empty string)
          const hasValidAnswer = answer !== null && 
                               answer !== undefined && 
                               answer !== '' && 
                               !(Array.isArray(answer) && answer.length === 0);
          
          // Only include questions with valid answers
          if (hasValidAnswer) {
            questions.push({
              id: question.id,
              label: question.label,
              sectionTitle: section.section_title,
              answer: answer
            });
          }
        }
      });
    });
    return questions;
  }, [formTemplate, answers]);

  // Questions that typically require investigation for driving licenses
  const concerningKeywords = [
    'diabetes', 'eye_disease', 'heart_condition', 'epilepsy', 'vision_problems', 
    'double_vision', 'night_blindness', 'color_blindness', 'medications',
    'synproblem', 'ögonsjukdom', 'hjärt', 'medicin', 'dubbelseende', 'nattblind'
  ];
  
  // Identify follow-up questions from form template
  const followupQuestions = React.useMemo(() => {
    if (!formTemplate?.schema) return new Set<string>();
    
    const followupIds = new Set<string>();
    formTemplate.schema.sections.forEach(section => {
      section.questions.forEach(question => {
        // Check if question has show_if condition (indicates it's a follow-up)
        if (question.show_if) {
          followupIds.add(question.id);
        }
        // Check if question is listed in followup_question_ids of other questions
        if (question.followup_question_ids) {
          question.followup_question_ids.forEach(id => followupIds.add(id));
        }
      });
    });
    return followupIds;
  }, [formTemplate]);
  
  const concerningAnswers = orderedQuestions.filter(question => {
    const value = question.answer;
    const isPositive = value === true || value === 'ja' || value === 'yes';
    const hasConcerningKeyword = concerningKeywords.some(keyword => 
      question.id.toLowerCase().includes(keyword) || 
      question.label.toLowerCase().includes(keyword)
    );
    const isAnsweredFollowup = followupQuestions.has(question.id);
    
    return (isPositive && hasConcerningKeyword) || isAnsweredFollowup;
  });

  const renderAnswerValue = (value: any): string => {
    if (typeof value === 'boolean') {
      return value ? 'Ja' : 'Nej';
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value || 'Ej besvarat');
  };

  if (!hasAnswers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Formulär
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Kunden har inte fyllt i formuläret än. Du kan skapa ett nytt formulär eller fortsätta med undersökningen.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Skapa nytt formulär
            </Button>
            <Button onClick={onNext}>
              Fortsätt utan formulär
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Formuläröversikt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status summary */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Formulärstatus:</span>
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Komplett
          </Badge>
        </div>

        {/* Concerning answers alert */}
        {concerningAnswers.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Flaggade svar som kräver uppmärksamhet:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {concerningAnswers.map((item, index) => (
                    <li key={index}>
                      {item.label}: <AnswerDisplayHelper answer={item.answer} />
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading state for form template */}
        {isLoadingTemplate ? (
          <div className="space-y-4">
            <h4 className="font-medium">Alla svar</h4>
            <div className="grid gap-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          </div>
        ) : (
          /* Ordered answers display */
          <div className="space-y-4">
            <h4 className="font-medium">Alla svar</h4>
            {orderedQuestions.length > 0 ? (
              <div className="space-y-6">
                {formTemplate?.schema.sections.map(section => {
                  const sectionQuestions = orderedQuestions.filter(q => q.sectionTitle === section.section_title);
                  if (sectionQuestions.length === 0) return null;
                  
                  return (
                    <div key={section.section_title} className="space-y-3">
                      <h5 className="text-sm font-semibold text-muted-foreground border-b pb-1">
                        {section.section_title}
                      </h5>
                      <div className="grid gap-3">
                        {sectionQuestions.map(question => (
                          <div 
                            key={question.id} 
                            className={`flex justify-between items-start p-3 rounded-lg border ${
                              concerningAnswers.some(item => item.id === question.id) 
                                ? 'border-destructive/20 bg-destructive/5' 
                                : 'border-border bg-background'
                            }`}
                          >
                            <span className="text-sm font-medium flex-1 pr-4">
                              {question.label}:
                            </span>
                            <div className="text-sm text-right max-w-xs flex items-center gap-1">
                              <AnswerDisplayHelper answer={question.answer} />
                              {concerningAnswers.some(item => item.id === question.id) && (
                                <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Fallback for missing form template */
              <div className="grid gap-3">
                {Object.entries(answers).map(([key, value]) => (
                  <div 
                    key={key} 
                    className="flex justify-between items-start p-3 rounded-lg border border-border bg-background"
                  >
                    <span className="text-sm font-medium capitalize">
                      {questionLabelMap[key] || key.replace(/_/g, ' ')}:
                    </span>
                    <span className="text-sm text-right max-w-xs">
                      <AnswerDisplayHelper answer={value} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        {concerningAnswers.length > 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {concerningAnswers.length} svar kräver extra uppmärksamhet under undersökningen. 
              Kontrollera dessa punkter noggrant vid visusmätning.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Inga svar som direkt flaggar för körkortsundersökning. Fortsätt med visusmätning.
            </AlertDescription>
          </Alert>
        )}

        {/* Navigation */}
        <div className="flex justify-end">
          <Button onClick={onNext}>
            Fortsätt till visusmätning
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};