
/**
 * This component displays the answers provided by the patient in the anamnesis form.
 * It renders the answers in a table format, showing the question and corresponding answer.
 * It also handles the case when no answers are available yet and provides visual indicators
 * for scrolling and content boundaries.
 */

import { FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FormattedAnswer {
  id: string;
  answer: string | number | boolean;
}

interface AnsweredSection {
  section_title: string;
  responses: FormattedAnswer[];
}

interface FormattedAnswersContent {
  formTitle?: string;
  submissionTimestamp?: string;
  answeredSections: AnsweredSection[];
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

  // Function to extract the correct formatted answers data, handling different possible structures
  const extractFormattedAnswers = (): FormattedAnswersContent | undefined => {
    // Case 1: New format with double nesting: answers.formattedAnswers.formattedAnswers
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
    
    // Case 2: Single nesting: answers.formattedAnswers
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
    
    // Case 3: Direct structure: answers.answeredSections
    if (
      answers && 
      typeof answers === 'object' && 
      'answeredSections' in answers
    ) {
      return answers as unknown as FormattedAnswersContent;
    }
    
    // No structured answers found
    return undefined;
  };

  // Extract formatted answers data
  const formattedAnswersData = extractFormattedAnswers();
  
  // If we have structured data, render it accordingly
  if (formattedAnswersData?.answeredSections) {
    return (
      <div className="flex flex-col">
        <h3 className="text-lg font-medium flex items-center mb-4">
          <FileText className="h-5 w-5 mr-2 text-primary" />
          Patientens svar
          {formattedAnswersData.formTitle && <span className="text-sm ml-2 text-muted-foreground">({formattedAnswersData.formTitle})</span>}
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
                  {section.responses.map((response, responseIndex) => (
                    <TableRow key={`${section.section_title}-${response.id}-${responseIndex}`}>
                      <TableCell className="font-medium py-3">
                        {questionLabels[response.id] || response.id}
                      </TableCell>
                      <TableCell className="whitespace-pre-wrap break-words py-3">
                        {response.answer !== null && response.answer !== undefined 
                          ? String(response.answer) 
                          : ""}
                      </TableCell>
                    </TableRow>
                  ))}
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
                    {answer !== null && answer !== undefined ? String(answer) : ""}
                  </TableCell>
                </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
