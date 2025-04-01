
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";

interface InternalNotesProps {
  notes: string;
  setNotes: (value: string) => void;
  saveNotes: () => void;
  isPending: boolean;
}

export const InternalNotes = ({ 
  notes, 
  setNotes, 
  saveNotes, 
  isPending 
}: InternalNotesProps) => {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium">Interna anteckningar</h3>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Lägg till anteckningar för framtida undersökning..."
        rows={4}
      />
      <Button 
        variant="outline" 
        size="sm" 
        onClick={saveNotes}
        disabled={isPending}
      >
        {isPending && (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        )}
        <Save className="h-4 w-4 mr-1" />
        Spara anteckningar
      </Button>
    </div>
  );
};
