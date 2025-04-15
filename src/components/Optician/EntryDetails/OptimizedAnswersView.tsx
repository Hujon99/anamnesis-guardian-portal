/**
 * This component displays the patient's anamnesis answers in an optimized text format.
 * It directly manages the formatted raw data stored in the database and provides
 * interfaces for editing, saving, and generating AI summaries from that data.
 */

import { useFormTemplate } from "@/hooks/useFormTemplate";
import { useEffect, useState } from "react";
import { FileText, Lightbulb, Copy, CheckCheck, PenLine, Save, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFormattedRawData } from "@/hooks/useFormattedRawData";

interface OptimizedAnswersViewProps {
  answers: Record<string, any>;
  hasAnswers: boolean;
  status: string;
  entryId: string;
  aiSummary: string | null;
  onSaveSummary: (summary: string) => void;
  formattedRawData: string;
  setFormattedRawData: (data: string) => void;
  saveFormattedRawData: () => void;
  isPending: boolean;
}

export const OptimizedAnswersView = ({ 
  answers, 
  hasAnswers, 
  status,
  entryId,
  aiSummary,
  onSaveSummary,
  formattedRawData: initialFormattedRawData,
  setFormattedRawData,
  saveFormattedRawData,
  isPending
}: OptimizedAnswersViewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [summary, setSummary] = useState<string>(aiSummary || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(aiSummary ? "summary" : "raw");
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    formattedRawData,
    setFormattedRawData: updateFormattedRawData,
    generateRawData,
    isGenerating: isRegeneratingRawData,
    saveIndicator,
    setSaveIndicator
  } = useFormattedRawData(
    initialFormattedRawData || "",
    answers,
    hasAnswers,
    (data: string) => {
      setFormattedRawData(data);
      saveFormattedRawData();
    }
  );

  useEffect(() => {
    console.log("aiSummary updated:", aiSummary);
    if (aiSummary) {
      setSummary(aiSummary);
      if (aiSummary.trim().length > 0) {
        setActiveTab("summary");
        console.log("Switching to summary tab due to aiSummary update");
      }
    }
  }, [aiSummary]);

  const handleTabChange = (value: string) => {
    console.log("Tab changed to:", value);
    setActiveTab(value);
  };

  const generateSummary = async () => {
    if (!formattedRawData) {
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
          promptText: formattedRawData
        }
      });

      if (error) {
        throw new Error(`${error.message || 'Ett fel uppstod vid anrop till AI-sammanfattning'}`);
      }

      if (data?.summary) {
        setSummary(data.summary);
        setActiveTab("summary");
        console.log("Successfully generated summary:", data.summary.substring(0, 50) + "...");
        
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
      
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    }
  };

  const toggleEditing = () => {
    if (isEditing && formattedRawData !== initialFormattedRawData) {
      saveFormattedRawData();
    }
    setIsEditing(!isEditing);
  };

  const saveChanges = () => {
    setIsSaving(true);
    setSaveIndicator("unsaved");
    
    try {
      saveFormattedRawData();
      
      toast({
        title: "Ändringar sparade",
        description: "Dina anteckningar har sparats för AI-sammanfattning",
      });
      
      setSaveIndicator("saved");
      setTimeout(() => setSaveIndicator(null), 2000);
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving edited text:", error);
      toast({
        title: "Kunde inte spara ändringar",
        description: "Ett fel uppstod, försök igen senare",
        variant: "destructive",
      });
      setSaveIndicator(null);
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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium flex items-center">
          <FileText className="h-5 w-5 mr-2 text-primary" />
          Patientens svar och anteckningar
        </h3>
        
        <div className="flex gap-2 items-center">
          {saveIndicator === "unsaved" && (
            <span className="text-amber-500 text-xs">Osparade ändringar</span>
          )}
          {saveIndicator === "saved" && (
            <span className="text-green-500 text-xs flex items-center">
              <CheckCheck className="h-3 w-3 mr-1" />
              Sparad
            </span>
          )}
          
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  updateFormattedRawData(initialFormattedRawData || "");
                  setIsEditing(false);
                }}
                className="flex items-center"
              >
                Återställ
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={saveChanges}
                disabled={isSaving || isPending}
                className="flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving || isPending ? "Sparar..." : "Spara ändringar"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={generateRawData}
                disabled={isRegeneratingRawData || !hasAnswers}
                className="flex items-center"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRegeneratingRawData ? 'animate-spin' : ''}`} />
                {isRegeneratingRawData ? "Genererar..." : "Generera rådata"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleEditing}
                className="flex items-center"
              >
                <PenLine className="h-4 w-4 mr-2" />
                Redigera anteckningar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={generateSummary}
                disabled={isGenerating || !formattedRawData}
                className="flex items-center"
              >
                <Lightbulb className="h-4 w-4 mr-2 text-amber-500" />
                {isGenerating ? "Genererar..." : summary ? "Uppdatera AI-sammanfattning" : "Generera AI-sammanfattning"}
              </Button>
            </>
          )}
        </div>
      </div>
      
      <div className="flex-grow overflow-hidden border rounded-md flex flex-col">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full w-full">
          <div className="border-b px-4 pt-2">
            <TabsList className="bg-transparent p-0 h-auto">
              <TabsTrigger value="raw" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Rådatavy
              </TabsTrigger>
              <TabsTrigger 
                value="summary" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                disabled={!summary || summary.trim().length === 0}
              >
                AI-sammanfattning
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-grow flex flex-col overflow-hidden">
            <TabsContent 
              value="raw" 
              className="flex-grow m-0 h-full border-0 p-0 overflow-auto"
            >
              {isEditing ? (
                <Textarea 
                  value={formattedRawData}
                  onChange={(e) => {
                    updateFormattedRawData(e.target.value);
                    setSaveIndicator("unsaved");
                  }}
                  className="min-h-[400px] font-mono text-sm h-full w-full resize-none border-0 p-4"
                  placeholder="Redigera svaren eller lägg till anteckningar..."
                />
              ) : (
                <ScrollArea className="h-full w-full">
                  <div className="p-4">
                    <pre className="whitespace-pre-wrap text-sm">
                      {formattedRawData || ""}
                    </pre>
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
            
            <TabsContent 
              value="summary" 
              className="flex-grow m-0 h-full border-0 p-0 overflow-auto"
            >
              <ScrollArea className="h-full w-full">
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
                        disabled={!summary || summary.trim().length === 0}
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
                      {summary && summary.trim().length > 0 
                        ? summary 
                        : "Ingen AI-sammanfattning tillgänglig"
                      }
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};
