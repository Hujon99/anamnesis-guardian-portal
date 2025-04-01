
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
            .map(([question, answer]) => (
              <TableRow key={question}>
                <TableCell className="font-medium">
                  {question === 'problem' ? 'Synproblem' : 
                   question === 'symptom' ? 'Symptom/Huvudvärk' : 
                   question === 'current_use' ? 'Nuvarande synhjälpmedel' : 
                   question}
                </TableCell>
                <TableCell className="whitespace-pre-wrap break-words">{answer}</TableCell>
              </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
