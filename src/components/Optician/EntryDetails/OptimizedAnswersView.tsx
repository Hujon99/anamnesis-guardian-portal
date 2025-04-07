
/**
 * This component displays the patient's anamnesis answers in an optimized text format.
 * It converts the complex JSON structure into a readable text representation
 * that's suitable for AI processing and human reading. It also includes functionality
 * to generate AI summaries using Azure OpenAI.
 */

import { useFormTemplate } from "@/hooks/useFormTemplate";
import { useEffect, useState } from "react";
import { FileText, Lightbulb } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { createOptimizedPromptInput, extractFormattedAnswers } from "@/utils/anamnesisTextUtils";
import { supabase } from "@/integrations/supabase/client";

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
  const [summary, setSummary] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("raw");

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

  const generateSummary = async () => {
    if (!optimizedText) {
      toast({
        title: "Kunde inte generera sammanfattning",
        description: "Det finns inga svar att sammanfatta.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-summary', {
        body: {
          promptText: optimizedText
        }
      });

      if (error) {
        throw new Error(`${error.message || 'Ett fel uppstod vid anrop till AI-sammanfattning'}`);
      }

      if (data?.summary) {
        setSummary(data.summary);
        setActiveTab("summary");
      } else {
        throw new Error('Fick inget svar från AI-tjänsten');
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      toast({
        title: "Kunde inte generera sammanfattning",
        description: error instanceof Error ? error.message : "Ett oväntat fel uppstod",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

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
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium flex items-center">
          <FileText className="h-5 w-5 mr-2 text-primary" />
          Patientens svar
        </h3>
        
        <Button
          variant="outline"
          size="sm"
          onClick={generateSummary}
          disabled={isGenerating || !optimizedText}
          className="flex items-center"
        >
          <Lightbulb className="h-4 w-4 mr-2 text-amber-500" />
          {isGenerating ? "Genererar..." : "Generera AI-sammanfattning"}
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mb-2">
          <TabsTrigger value="raw">Rådata</TabsTrigger>
          <TabsTrigger value="summary" disabled={!summary}>
            AI-sammanfattning
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="raw" className="flex-1 border border-muted rounded-md overflow-hidden shadow-sm flex flex-col">
          <ScrollArea className="h-full max-h-[60vh]">
            <pre className="p-4 whitespace-pre-wrap text-sm">
              {optimizedText}
            </pre>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="summary" className="flex-1 border border-muted rounded-md overflow-hidden shadow-sm flex flex-col">
          <ScrollArea className="h-full max-h-[60vh]">
            <div className="p-4">
              <div className="bg-muted/40 p-4 rounded-md border border-primary/10">
                <h4 className="text-primary font-medium flex items-center mb-2">
                  <Lightbulb className="h-4 w-4 mr-2 text-amber-500" />
                  AI-sammanfattning
                </h4>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {summary}
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
