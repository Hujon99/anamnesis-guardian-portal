
/**
 * This component renders the tab content for raw data and AI summary views.
 * Simplified to use conditional rendering instead of nested tabs to avoid conflicts.
 */

import { ScrollArea } from "@/components/ui/scroll-area";
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
    aiSummaryPreview: aiSummary?.substring(0, 50) + "..."
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab Headers */}
      <div className="border-b px-3 sm:px-4 pt-2 flex-shrink-0">
        <div className="flex space-x-4">
          <button
            onClick={() => onTabChange("raw")}
            className={`pb-2 px-1 border-b-2 transition-colors text-sm ${
              activeTab === "raw"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Rådatavy
          </button>
          <button
            onClick={() => onTabChange("summary")}
            className={`pb-2 px-1 border-b-2 transition-colors text-sm ${
              activeTab === "summary"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            AI-sammanfattning
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {/* Raw Data Tab */}
        {activeTab === "raw" && (
          <div className="h-full flex flex-col overflow-hidden">
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
                  className="h-full w-full resize-none border-0 p-3 sm:p-4 font-mono text-xs sm:text-sm"
                  placeholder="Redigera svaren eller lägg till anteckningar..."
                />
              ) : (
                <ScrollArea className="h-full">
                  <div className="p-3 sm:p-4">
                    <pre className="whitespace-pre-wrap text-xs sm:text-sm">
                      {formattedRawData || ""}
                    </pre>
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        )}
        
        {/* AI Summary Tab */}
        {activeTab === "summary" && (
          <div className="h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-muted/20 flex-shrink-0">
              <div className="flex items-center">
                <Lightbulb className="h-4 w-4 mr-2 text-amber-500" />
                <h4 className="text-primary font-medium text-sm sm:text-base">AI-sammanfattning</h4>
              </div>
              
              {hasSummary && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onCopy}
                  className="flex items-center text-xs sm:text-sm"
                >
                  {isCopied ? (
                    <>
                      <CheckCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-green-500" />
                      Kopierad
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Kopiera
                    </>
                  )}
                </Button>
              )}
            </div>
            
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 sm:p-6">
                  {hasSummary ? (
                    <div className="prose prose-sm max-w-none leading-relaxed text-foreground">
                      <div className="whitespace-pre-wrap text-sm">
                        {aiSummary}
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground italic text-center py-8">
                      <p className="text-sm">
                        Ingen AI-sammanfattning tillgänglig än. Generera en genom att klicka på "Generera sammanfattning"-knappen.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
