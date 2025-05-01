
/**
 * This component renders the tab content for raw data and AI summary views.
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
  summary: string;
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
  summary,
  isCopied,
  onCopy,
  onRegenerateData,
  isRegenerating = false
}: ContentTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="flex flex-col h-full w-full">
      <div className="border-b px-4 pt-2">
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
          <div className="flex justify-end p-2">
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
          
          {isEditing ? (
            <Textarea 
              value={formattedRawData}
              onChange={(e) => onRawDataChange(e.target.value)}
              className="min-h-[400px] font-mono text-sm h-full w-full resize-none border-0 p-4"
              placeholder="Redigera svaren eller lägg till anteckningar..."
            />
          ) : (
            <ScrollArea className="h-full w-full">
              <div className="p-4">
                <pre className="whitespace-pre-wrap text-sm">
                  {formattedRawData}
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
                    onClick={onCopy}
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
  );
};
