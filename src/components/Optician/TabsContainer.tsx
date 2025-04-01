
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntriesList } from "@/components/Optician/EntriesList";
import { useAnamnesis } from "@/contexts/AnamnesisContext";
import { useEffect } from "react";

export function TabsContainer() {
  const { activeTab, setActiveTab, selectedEntry, setSelectedEntry } = useAnamnesis();

  useEffect(() => {
    setSelectedEntry(null);
  }, [activeTab, setSelectedEntry]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="draft">Utkast</TabsTrigger>
        <TabsTrigger value="sent">Skickade</TabsTrigger>
        <TabsTrigger value="pending">Att granska</TabsTrigger>
        <TabsTrigger value="ready">Klara</TabsTrigger>
      </TabsList>
      
      <TabsContent value="draft" className="mt-4">
        <EntriesList 
          status="draft" 
          selectedEntry={selectedEntry}
          onSelectEntry={setSelectedEntry}
        />
      </TabsContent>

      <TabsContent value="sent" className="mt-4">
        <EntriesList 
          status="sent" 
          selectedEntry={selectedEntry}
          onSelectEntry={setSelectedEntry}
        />
      </TabsContent>
      
      <TabsContent value="pending" className="mt-4">
        <EntriesList 
          status="pending" 
          selectedEntry={selectedEntry}
          onSelectEntry={setSelectedEntry}
        />
      </TabsContent>
      
      <TabsContent value="ready" className="mt-4">
        <EntriesList 
          status="ready" 
          selectedEntry={selectedEntry}
          onSelectEntry={setSelectedEntry}
        />
      </TabsContent>
    </Tabs>
  );
}
