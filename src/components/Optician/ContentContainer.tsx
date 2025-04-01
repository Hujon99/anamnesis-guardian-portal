
import { EntryDetails } from "@/components/Optician/EntryDetails";
import { useAnamnesis } from "@/contexts/AnamnesisContext";

export function ContentContainer() {
  const { selectedEntry, setSelectedEntry } = useAnamnesis();

  return (
    <>
      {selectedEntry ? (
        <EntryDetails 
          entry={selectedEntry} 
          onEntryUpdated={() => setSelectedEntry(null)} 
        />
      ) : (
        <div className="border rounded-lg p-6 text-center h-full flex items-center justify-center">
          <p className="text-muted-foreground">
            Välj en anamnes från listan för att se detaljer
          </p>
        </div>
      )}
    </>
  );
}
