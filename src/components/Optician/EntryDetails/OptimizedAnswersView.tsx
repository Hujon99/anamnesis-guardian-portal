
/**
 * This component displays the patient's anamnesis answers in an optimized text format.
 * It converts the complex JSON structure into a readable text representation
 * that's suitable for AI processing and human reading.
 */

import { useFormTemplate } from "@/hooks/useFormTemplate";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createOptimizedPromptInput, extractFormattedAnswers } from "@/utils/anamnesisTextUtils";

interface OptimizedAnswersViewProps {
  answers: Record<string, any>;
  hasAnswers: boolean;
  status: string;
}

export const OptimizedAnswersView = ({ 
  answers, 
  hasAnswers, 
  status 
}: OptimizedAnswersViewProps) => {
  const { data: formTemplate } = useFormTemplate();
  const [optimizedText, setOptimizedText] = useState<string>("");

  // Generate optimized text when answers or form template changes
  useEffect(() => {
    if (!hasAnswers || !formTemplate) {
      return;
    }

    try {
      // Extract the formatted answers from whatever structure we have
      const formattedAnswers = extractFormattedAnswers(answers);
      
      if (formattedAnswers) {
        // Generate the optimized text
        const text = createOptimizedPromptInput(formTemplate, formattedAnswers);
        setOptimizedText(text);
      } else {
        console.warn("Could not extract formatted answers from the data structure");
        setOptimizedText("Kunde inte formatera svaren på ett läsbart sätt.");
      }
    } catch (error) {
      console.error("Error generating optimized text:", error);
      setOptimizedText("Ett fel uppstod vid formatering av svaren.");
    }
  }, [answers, formTemplate, hasAnswers]);

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

  return (
    <div className="flex flex-col flex-1">
      <h3 className="text-lg font-medium flex items-center mb-4">
        <FileText className="h-5 w-5 mr-2 text-primary" />
        Patientens svar
      </h3>
      
      <div className="border border-muted rounded-md overflow-hidden shadow-sm flex-1">
        <ScrollArea className="h-full max-h-[60vh]">
          <pre className="p-4 whitespace-pre-wrap text-sm">
            {optimizedText}
          </pre>
        </ScrollArea>
      </div>
    </div>
  );
};
