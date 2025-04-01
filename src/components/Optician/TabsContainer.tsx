
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntriesList } from "@/components/Optician/EntriesList";
import { useAnamnesis } from "@/contexts/AnamnesisContext";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export function TabsContainer() {
  const { 
    activeTab, 
    setActiveTab, 
    selectedEntry, 
    setSelectedEntry,
    isLoading,
    forceRefresh,
    dataLastUpdated
  } = useAnamnesis();
  const [lastTabChange, setLastTabChange] = useState<Date | null>(null);

  useEffect(() => {
    // If activeTab is 'draft', redirect to 'sent' since draft no longer exists
    if (activeTab === 'draft') {
      setActiveTab('sent');
    }
    
    // Always clear selection when switching tabs
    setSelectedEntry(null);
    
    // Record when we last changed tabs
    setLastTabChange(new Date());
    
    // Force refresh when switching tabs
    if (activeTab) {
      forceRefresh();
    }
  }, [activeTab, setActiveTab, setSelectedEntry, forceRefresh]);

  const handleTabChange = (value: string) => {
    // Show a toast to indicate refreshing
    toast({
      title: `Byter till ${getTabLabel(value)}`,
      description: "Uppdaterar data...",
    });
    
    // Set the active tab
    setActiveTab(value);
  };

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case "sent": return "Skickade";
      case "pending": return "Att granska";
      case "ready": return "Klara";
      default: return tab;
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="sent" className="relative">
          Skickade
          {isLoading && activeTab === "sent" && (
            <Loader2 className="h-3 w-3 animate-spin absolute top-1 right-1" />
          )}
        </TabsTrigger>
        <TabsTrigger value="pending" className="relative">
          Att granska
          {isLoading && activeTab === "pending" && (
            <Loader2 className="h-3 w-3 animate-spin absolute top-1 right-1" />
          )}
        </TabsTrigger>
        <TabsTrigger value="ready" className="relative">
          Klara
          {isLoading && activeTab === "ready" && (
            <Loader2 className="h-3 w-3 animate-spin absolute top-1 right-1" />
          )}
        </TabsTrigger>
      </TabsList>
      
      <div className="flex justify-between items-center mt-2 mb-2">
        <p className="text-xs text-muted-foreground">
          {dataLastUpdated && 
           `Senast uppdaterad: ${dataLastUpdated.toLocaleTimeString('sv-SE')}`}
        </p>
        {isLoading && (
          <Badge variant="outline" className="flex items-center animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            Uppdaterar...
          </Badge>
        )}
      </div>
      
      <TabsContent value="sent" className="mt-2">
        <EntriesList 
          status="sent" 
          selectedEntry={selectedEntry}
          onSelectEntry={setSelectedEntry}
        />
      </TabsContent>
      
      <TabsContent value="pending" className="mt-2">
        <EntriesList 
          status="pending" 
          selectedEntry={selectedEntry}
          onSelectEntry={setSelectedEntry}
        />
      </TabsContent>
      
      <TabsContent value="ready" className="mt-2">
        <EntriesList 
          status="ready" 
          selectedEntry={selectedEntry}
          onSelectEntry={setSelectedEntry}
        />
      </TabsContent>
    </Tabs>
  );
}
