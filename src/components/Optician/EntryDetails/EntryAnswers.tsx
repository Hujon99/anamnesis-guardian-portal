
/**
 * This component displays the answers provided by the patient in the anamnesis form.
 * It renders the answers in a table format, showing the question and corresponding answer.
 * It also handles the case when no answers are available yet.
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

interface FormattedAnswers {
  formTitle?: string;
  submissionTimestamp?: string;
  answeredSections: AnsweredSection[];
}

interface AnswersData {
  formattedAnswers?: FormattedAnswers;
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
  glasögon_funktion: "Glasögonfunktion"
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

  // Extract formatted answers data
  let formattedAnswersData: FormattedAnswers | undefined;
  
  // Check if answers follows the new structured format
  if ('formattedAnswers' in answers) {
    formattedAnswersData = answers.formattedAnswers;
  } else if ('answeredSections' in answers) {
    // Handle case where formattedAnswers might be directly in answers
    formattedAnswersData = answers as unknown as FormattedAnswers;
  } 
  
  // If we have structured data, render it accordingly
  if (formattedAnswersData?.answeredSections) {
    return (
      <div>
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-primary" />
          Patientens svar
        </h3>
        
        {formattedAnswersData.answeredSections.map((section, sectionIndex) => (
          <div key={`section-${sectionIndex}`} className="mb-6">
            <h4 className="text-md font-medium mb-2">{section.section_title}</h4>
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
                    <TableCell className="font-medium">
                      {questionLabels[response.id] || response.id}
                    </TableCell>
                    <TableCell className="whitespace-pre-wrap break-words">
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
    );
  }

  // Fallback to legacy format if no structured data is found
  return (
    <div>
      <h3 className="text-lg font-medium mb-4 flex items-center">
        <FileText className="h-5 w-5 mr-2 text-primary" />
        Patientens svar
      </h3>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/3">Fråga</TableHead>
            <TableHead>Svar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(answers)
            .filter(([key]) => key !== 'formMetadata')
            .map(([questionId, answer]) => (
              <TableRow key={questionId}>
                <TableCell className="font-medium">
                  {questionLabels[questionId] || questionId}
                </TableCell>
                <TableCell className="whitespace-pre-wrap break-words">
                  {answer !== null && answer !== undefined ? String(answer) : ""}
                </TableCell>
              </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
