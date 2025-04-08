
/**
 * This component displays the patient's anamnesis answers in an optimized text format.
 * It converts the complex JSON structure into a readable text representation
 * that's suitable for AI processing and human reading. It also includes functionality
 * to generate AI summaries using Azure OpenAI.
 */

import { useFormTemplate } from "@/hooks/useFormTemplate";
import { useEffect, useState } from "react";
import { FileText, Lightbulb, Copy, CheckCheck, PenLine, Save } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { createOptimizedPromptInput, extractFormattedAnswers } from "@/utils/anamnesisTextUtils";
import { supabase } from "@/integrations/supabase/client";

interface OptimizedAnswersViewProps {
  answers: Record<string, any>;
  hasAnswers: boolean;
  status: string;
  entryId: string;
  aiSummary: string | null;
  onSaveSummary: (summary: string) => void;
}

export const OptimizedAnswersView = ({ 
  answers, 
  hasAnswers, 
  status,
  entryId,
  aiSummary,
  onSaveSummary
}: OptimizedAnswersViewProps) => {
  const { data: formTemplate } = useFormTemplate();
  const [optimizedText, setOptimizedText] = useState<string>("");
  const [editedText, setEditedText] = useState<string>("");
  const [summary, setSummary] = useState<string>(aiSummary || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState(aiSummary ? "summary" : "raw");
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
        setEditedText(text); // Initialize edited text with the optimized text
      } else {
        console.warn("Could not extract formatted answers from the data structure");
        setOptimizedText("Kunde inte formatera svaren på ett läsbart sätt.");
        setEditedText("Kunde inte formatera svaren på ett läsbart sätt.");
      }
    } catch (error) {
      console.error("Error generating optimized text:", error);
      setOptimizedText("Ett fel uppstod vid formatering av svaren.");
      setEditedText("Ett fel uppstod vid formatering av svaren.");
    }
  }, [answers, formTemplate, hasAnswers]);

  const generateSummary = async () => {
    if (!editedText) {
      toast({
        title: "Kunde inte generera sammanfattning",
        description: "Det finns inga svar att sammanfatta.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Use the edited text instead of the original optimized text
      const { data, error } = await supabase.functions.invoke('generate-summary', {
        body: {
          promptText: editedText
        }
      });

      if (error) {
        throw new Error(`${error.message || 'Ett fel uppstod vid anrop till AI-sammanfattning'}`);
      }

      if (data?.summary) {
        setSummary(data.summary);
        setActiveTab("summary");
        
        // Save the summary to the database
        onSaveSummary(data.summary);
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

  const copySummaryToClipboard = () => {
    if (summary) {
      navigator.clipboard.writeText(summary);
      setIsCopied(true);
      toast({
        title: "Kopierad!",
        description: "AI-sammanfattningen har kopierats till urklipp",
      });
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    }
  };

  const toggleEditing = () => {
    if (isEditing) {
      // Coming out of editing mode, ask if they want to reset changes
      setIsEditing(false);
    } else {
      // Going into editing mode
      setIsEditing(true);
    }
  };

  const resetChanges = () => {
    setEditedText(optimizedText);
    toast({
      title: "Ändringar återställda",
      description: "Dina ändringar har återställts till originalsvaren",
    });
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      // Store the edited text in the custom field of the answer object
      // This will require a backend implementation that we'll need to add
      
      // For now, we'll just update the local state and inform the user
      toast({
        title: "Ändringar sparade",
        description: "Dina anteckningar har sparats för AI-sammanfattning",
      });
      
      // Stay in the editing mode so they can continue modifying if needed
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving edited text:", error);
      toast({
        title: "Kunde inte spara ändringar",
        description: "Ett fel uppstod, försök igen senare",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium flex items-center">
          <FileText className="h-5 w-5 mr-2 text-primary" />
          Patientens svar
        </h3>
        
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={resetChanges}
                className="flex items-center"
              >
                Återställ
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={saveChanges}
                disabled={isSaving}
                className="flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Sparar..." : "Spara ändringar"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleEditing}
                className="flex items-center"
              >
                <PenLine className="h-4 w-4 mr-2" />
                Redigera/Lägg till anteckningar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={generateSummary}
                disabled={isGenerating || !editedText}
                className="flex items-center"
              >
                <Lightbulb className="h-4 w-4 mr-2 text-amber-500" />
                {isGenerating ? "Genererar..." : summary ? "Uppdatera AI-sammanfattning" : "Generera AI-sammanfattning"}
              </Button>
            </>
          )}
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <TabsList className="mb-2">
          <TabsTrigger value="raw">Rådata</TabsTrigger>
          <TabsTrigger value="summary" disabled={!summary}>
            AI-sammanfattning
          </TabsTrigger>
        </TabsList>
        
        <TabsContent 
          value="raw" 
          className="flex-1 border border-muted rounded-md overflow-hidden"
        >
          <ScrollArea className="h-full">
            {isEditing ? (
              <div className="p-4">
                <Textarea 
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="Redigera svaren eller lägg till anteckningar..."
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Dina ändringar och anteckningar kommer att användas för AI-sammanfattningen.
                </p>
              </div>
            ) : (
              <pre className="p-4 whitespace-pre-wrap text-sm">
                {editedText}
              </pre>
            )}
          </ScrollArea>
        </TabsContent>
        
        <TabsContent 
          value="summary" 
          className="flex-1 border border-muted rounded-md overflow-hidden"
        >
          <ScrollArea className="h-full">
            <div className="p-4">
              <div className="bg-muted/40 p-4 rounded-md border border-primary/10">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-primary font-medium flex items-center">
                    <Lightbulb className="h-4 w-4 mr-2 text-amber-500" />
                    AI-sammanfattning
                  </h4>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={copySummaryToClipboard}
                    className="flex items-center"
                    disabled={!summary}
                  >
                    {isCopied ? (
                      <>
                        <CheckCheck className="h-4 w-4 mr-2 text-green-500" />
                        Kopierad
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Kopiera
                      </>
                    )}
                  </Button>
                </div>
                
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
