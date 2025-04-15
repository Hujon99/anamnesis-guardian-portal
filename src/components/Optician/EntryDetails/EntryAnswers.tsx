/**
 * This component displays the answers provided by the patient in the anamnesis form.
 * It properly handles both simple answers and dynamic follow-up questions with nested
 * answer structures, ensuring correct display of all answer types.
 */

import { FileText, MessageCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AnswerDisplayHelper } from "./AnswerDisplayHelper";

interface FormattedAnswer {
  id: string;
  answer: string | number | boolean | {
    value: string;
    parent_value?: string;
    parent_question?: string;
  };
}

interface AnsweredSection {
  section_title: string;
  responses: FormattedAnswer[];
}

interface FormattedAnswersContent {
  formTitle?: string;
  submissionTimestamp?: string;
  answeredSections: AnsweredSection[];
  isOpticianSubmission?: boolean;
}

interface AnswersData {
  formattedAnswers?: {
    formattedAnswers?: FormattedAnswersContent;
  };
  rawAnswers?: Record<string, any>;
  metadata?: {
    formTemplateId: string;
    submittedAt: string;
    version: string;
  };
}

interface EntryAnswersProps {
  answers: Record<string, any> | AnswersData;
  hasAnswers: boolean;
  status: string;
}

// Map of question IDs to human-readable labels
const questionLabels: Record<string, string> = {
  vision_problem: "Synproblem",
  symptom: "Huvudvärk eller ögontrötthet",
  eye_pain: "Var gör det ont",
  problem: "Synproblem",
  current_use: "Nuvarande synhjälpmedel",
  bokningsorsak: "Bokningsorsak",
  hjälpmedel: "Hjälpmedel",
  glasögon_ålder: "Ålder på glasögon",
  glasögon_funktion: "Glasögonfunktion",
  huvudvärk: "Huvudvärk"
};

// Add this helper function at the top of the file, before the component
const renderAnswer = (answer: any): string => {
  if (answer === null || answer === undefined) {
    return '';
  }
  
  // If answer is an object with a value property, use that
  if (typeof answer === 'object' && !Array.isArray(answer) && answer.value) {
    return answer.value;
  }
  
  // For arrays, join the values
  if (Array.isArray(answer)) {
    return answer.join(', ');
  }
  
  // For simple values (strings, numbers, booleans)
  return String(answer);
};

export const EntryAnswers = ({ answers, hasAnswers, status }: EntryAnswersProps) => {
  if (!hasAnswers) {
    return (
      status !== "draft" && (
        <div className="text-center p-4 border border-dashed rounded-md flex-1 min-h-[200px] flex items-center justify-center">
          <div>
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">
              {status === "sent" 
                ? "Väntar på att patienten ska fylla i anamnesen" 
                : "Ingen information från patienten"}
            </p>
          </div>
        </div>
      )
    );
  }

  // Extract formatted answers data
  const formattedAnswersData = (() => {
    if (
      answers && 
      typeof answers === 'object' && 
      'formattedAnswers' in answers && 
      answers.formattedAnswers && 
      typeof answers.formattedAnswers === 'object' &&
      'formattedAnswers' in answers.formattedAnswers &&
      answers.formattedAnswers.formattedAnswers
    ) {
      return answers.formattedAnswers.formattedAnswers;
    }
    
    if (
      answers && 
      typeof answers === 'object' && 
      'formattedAnswers' in answers && 
      answers.formattedAnswers && 
      typeof answers.formattedAnswers === 'object' &&
      'answeredSections' in answers.formattedAnswers
    ) {
      return answers.formattedAnswers;
    }
    
    if (
      answers && 
      typeof answers === 'object' && 
      'answeredSections' in answers
    ) {
      return answers as unknown as FormattedAnswersContent;
    }
    
    return undefined;
  })();

  // If we have structured data, render it accordingly
  if (formattedAnswersData?.answeredSections) {
    return (
      <div className="flex flex-col">
        <h3 className="text-lg font-medium flex items-center mb-4">
          <FileText className="h-5 w-5 mr-2 text-primary" />
          {formattedAnswersData.isOpticianSubmission ? "Optikerns ifyllda svar" : "Patientens svar"}
          {formattedAnswersData.formTitle && 
            <span className="text-sm ml-2 text-muted-foreground">
              ({formattedAnswersData.formTitle})
            </span>
          }
          {formattedAnswersData.isOpticianSubmission && (
            <Badge variant="outline" className="ml-2 bg-primary/10 text-primary">
              Ifylld av optiker
            </Badge>
          )}
        </h3>
        
        <div className="space-y-4">
          {formattedAnswersData.answeredSections.map((section, sectionIndex) => (
            <div 
              key={`section-${sectionIndex}`} 
              className="mb-6 border border-muted rounded-md overflow-hidden shadow-sm"
            >
              <h4 className="text-md font-medium p-3 bg-muted/20 border-b">
                {section.section_title}
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">Fråga</TableHead>
                    <TableHead>Svar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {section.responses.map((response, responseIndex) => {
                    const isOpticianComment = response.id.includes('_optiker_ovrigt');
                    
                    return (
                      <TableRow 
                        key={`${section.section_title}-${response.id}-${responseIndex}`}
                        className={isOpticianComment ? "bg-primary/5" : ""}
                      >
                        <TableCell className="font-medium py-3 flex items-center">
                          {isOpticianComment && <MessageCircle className="h-4 w-4 mr-2 text-primary" />}
                          {questionLabels[response.id] || response.id}
                          {isOpticianComment && (
                            <Badge variant="outline" className="ml-2 bg-primary/10 text-primary text-xs">
                              Optikernotering
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-pre-wrap break-words py-3">
                          {response.answer !== null && response.answer !== undefined 
                            ? renderAnswer(response.answer) 
                            : ""}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fallback to legacy format if no structured data is found
  return (
    <div className="flex flex-col">
      <h3 className="text-lg font-medium flex items-center mb-4">
        <FileText className="h-5 w-5 mr-2 text-primary" />
        Patientens svar
      </h3>
      
      <div className="border border-muted rounded-md overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/3">Fråga</TableHead>
              <TableHead>Svar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(answers)
              .filter(([key]) => key !== 'formMetadata' && key !== 'formattedAnswers' && key !== 'rawAnswers' && key !== 'metadata')
              .map(([questionId, answer]) => (
                <TableRow key={questionId}>
                  <TableCell className="font-medium py-3">
                    {questionLabels[questionId] || questionId}
                  </TableCell>
                  <TableCell className="whitespace-pre-wrap break-words py-3">
                    {answer !== null && answer !== undefined ? renderAnswer(answer) : ""}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
