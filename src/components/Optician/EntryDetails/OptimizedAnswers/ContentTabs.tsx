
/**
 * This component renders the tab content for raw data and AI summary views.
 * Simplified to use conditional rendering instead of nested tabs to avoid conflicts.
 */

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

  return (
    <div className="w-full">
      {/* Tab Headers */}
      <div className="border-b px-4 pt-2">
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
      <div className="p-4">
        {/* Raw Data Tab */}
        {activeTab === "raw" && (
          <div className="space-y-4">
            {onRegenerateData && !isEditing && (
              <div className="flex justify-end">
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
              </div>
            )}
            
            {isEditing ? (
              <Textarea 
                value={formattedRawData}
                onChange={(e) => onRawDataChange(e.target.value)}
                className="min-h-[400px] w-full resize-none font-mono text-xs sm:text-sm"
                placeholder="Redigera svaren eller lägg till anteckningar..."
              />
            ) : (
              <div className="min-h-[400px] p-4 border rounded bg-muted/20">
                <pre className="whitespace-pre-wrap text-xs sm:text-sm">
                  {formattedRawData || ""}
                </pre>
              </div>
            )}
          </div>
        )}
        
        {/* AI Summary Tab */}
        {activeTab === "summary" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
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
            
            <div className="min-h-[400px] p-4 border rounded bg-muted/20">
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
          </div>
        )}
      </div>
    </div>
  );
};
