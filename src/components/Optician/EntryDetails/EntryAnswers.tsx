
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

interface EntryAnswersProps {
  answers: Record<string, string>;
  hasAnswers: boolean;
  status: string;
}

// Map of question IDs to human-readable labels
const questionLabels: Record<string, string> = {
  vision_problem: "Synproblem",
  symptom: "Huvudvärk eller ögontrötthet",
  eye_pain: "Var gör det ont",
  problem: "Synproblem",
  current_use: "Nuvarande synhjälpmedel"
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
                <TableCell className="whitespace-pre-wrap break-words">{answer}</TableCell>
              </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
