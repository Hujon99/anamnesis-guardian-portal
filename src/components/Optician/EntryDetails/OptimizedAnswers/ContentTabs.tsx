
/**
 * This component renders the tab content for raw data and AI summary views.
 * Simplified to directly receive aiSummary prop for immediate display.
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, CheckCheck, Lightbulb, RefreshCw } from "lucide-react";

interface ContentTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  isEditing: boolean;
  formattedRawData: string;
  onRawDataChange: (value: string) => void;
  aiSummary: string | null;
  isCopied: boolean;
  onCopy: () => void;
  onRegenerateData?: () => void;
  isRegenerating?: boolean;
}

export const ContentTabs = ({
  activeTab,
  onTabChange,
  isEditing,
  formattedRawData,
  onRawDataChange,
  aiSummary,
  isCopied,
  onCopy,
  onRegenerateData,
  isRegenerating = false
}: ContentTabsProps) => {
  const hasSummary = aiSummary && aiSummary.trim().length > 0;
  
  console.log("ContentTabs render:", { 
    activeTab, 
    hasSummary, 
    aiSummaryLength: aiSummary?.length,
    aiSummaryContent: aiSummary?.substring(0, 100) + "..."
  });

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={onTabChange} className="flex flex-col h-full">
        <div className="border-b px-4 pt-2 flex-shrink-0">
          <TabsList className="bg-transparent p-0 h-auto">
            <TabsTrigger 
              value="raw" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              Rådatavy
            </TabsTrigger>
            <TabsTrigger 
              value="summary" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              AI-sammanfattning
            </TabsTrigger>
          </TabsList>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <TabsContent value="raw" className="h-full m-0 flex flex-col">
            <div className="flex justify-end p-2 flex-shrink-0">
              {onRegenerateData && !isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRegenerateData}
                  disabled={isRegenerating}
                  className="flex items-center text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {isRegenerating ? "Uppdaterar..." : "Uppdatera format"}
                </Button>
              )}
            </div>
            
            <div className="flex-1 overflow-hidden">
              {isEditing ? (
                <Textarea 
                  value={formattedRawData}
                  onChange={(e) => onRawDataChange(e.target.value)}
                  className="h-full w-full resize-none border-0 p-4 font-mono text-sm"
                  placeholder="Redigera svaren eller lägg till anteckningar..."
                />
              ) : (
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <pre className="whitespace-pre-wrap text-sm">
                      {formattedRawData || ""}
                    </pre>
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="summary" className="h-full m-0 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-muted/20 flex-shrink-0">
              <div className="flex items-center">
                <Lightbulb className="h-4 w-4 mr-2 text-amber-500" />
                <h4 className="text-primary font-medium">AI-sammanfattning</h4>
              </div>
              
              {hasSummary && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onCopy}
                  className="flex items-center"
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
              )}
            </div>
            
            <div className="flex-1 overflow-auto">
              <div className="p-4 min-h-full">
                {hasSummary ? (
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-foreground">
                    {aiSummary}
                  </div>
                ) : (
                  <div className="text-muted-foreground italic text-center py-8">
                    Ingen AI-sammanfattning tillgänglig än. Generera en genom att klicka på "Generera sammanfattning"-knappen.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
