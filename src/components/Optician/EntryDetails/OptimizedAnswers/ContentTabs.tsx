
/**
 * This component renders the tab content for raw data and AI summary views.
 * Simplified layout structure for better scrolling and improved user experience.
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
              disabled={!summary || summary.trim().length === 0}
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
            
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-foreground">
                    {summary && summary.trim().length > 0 
                      ? summary 
                      : (
                          <div className="text-muted-foreground italic">
                            Ingen AI-sammanfattning tillgänglig
                          </div>
                        )
                    }
                  </div>
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
