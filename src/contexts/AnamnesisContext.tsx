
import { createContext, useContext, ReactNode, useState } from "react";
import { AnamnesesEntry } from "@/types/anamnesis";

interface AnamnesisContextType {
  selectedEntry: AnamnesesEntry | null;
  setSelectedEntry: (entry: AnamnesesEntry | null) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const AnamnesisContext = createContext<AnamnesisContextType | undefined>(undefined);

export function AnamnesisProvider({ children }: { children: ReactNode }) {
  const [selectedEntry, setSelectedEntry] = useState<AnamnesesEntry | null>(null);
  const [activeTab, setActiveTab] = useState("draft");

  return (
    <AnamnesisContext.Provider value={{ 
      selectedEntry, 
      setSelectedEntry, 
      activeTab, 
      setActiveTab 
    }}>
      {children}
    </AnamnesisContext.Provider>
  );
}

export function useAnamnesis() {
  const context = useContext(AnamnesisContext);
  if (context === undefined) {
    throw new Error("useAnamnesis must be used within an AnamnesisProvider");
  }
  return context;
}
