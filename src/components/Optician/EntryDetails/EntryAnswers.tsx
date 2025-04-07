
/**
 * This component displays the answers provided by the patient in the anamnesis form.
 * It renders the answers in a table format, showing the question and corresponding answer.
 * It also handles the case when no answers are available yet.
 * The component uses a scrollable container with visual indicators to improve user experience.
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
        <div className="text-center p-4 border border-dashed rounded-md">
          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">
            {status === "sent" 
              ? "Väntar på att patienten ska fylla i anamnesen" 
              : "Ingen information från patienten"}
          </p>
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
      console.log("Found double-nested formattedAnswers structure");
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
      console.log("Found single-nested formattedAnswers structure");
      return answers.formattedAnswers;
    }
    
    // Case 3: Direct structure: answers.answeredSections
    if (
      answers && 
      typeof answers === 'object' && 
      'answeredSections' in answers
    ) {
      console.log("Found direct answeredSections structure");
      return answers as unknown as FormattedAnswersContent;
    }
    
    // No structured answers found
    console.log("No structured answers format found, falling back to legacy format");
    return undefined;
  };

  // Extract formatted answers data
  const formattedAnswersData = extractFormattedAnswers();
  
  // If we have structured data, render it accordingly
  if (formattedAnswersData?.answeredSections) {
    return (
      <div className="space-y-6 min-h-[400px]">
        <h3 className="text-lg font-medium mb-4 flex items-center sticky top-0 bg-background z-10 py-2">
          <FileText className="h-5 w-5 mr-2 text-primary" />
          Patientens svar
          {formattedAnswersData.formTitle && <span className="text-sm ml-2 text-muted-foreground">({formattedAnswersData.formTitle})</span>}
        </h3>
        
        <div className="pb-6">
          {formattedAnswersData.answeredSections.map((section, sectionIndex) => (
            <div 
              key={`section-${sectionIndex}`} 
              className="mb-8 border-b border-border pb-6 last:border-b-0"
            >
              <h4 className="text-md font-medium mb-3 border-b pb-1 bg-muted/30 px-2 py-1 rounded-sm">
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
    <div className="space-y-6 min-h-[400px]">
      <h3 className="text-lg font-medium mb-4 flex items-center sticky top-0 bg-background z-10 py-2">
        <FileText className="h-5 w-5 mr-2 text-primary" />
        Patientens svar
      </h3>
      
      <div className="pb-6 border-b border-border">
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
