
import { AnamnesesEntry } from "@/types/anamnesis";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { formatDate } from "@/lib/date-utils";
import { EntryStatusBadge } from "./EntryStatusBadge";
import { EntryStatusIcon } from "./EntryStatusIcon";

interface EntryCardProps {
  entry: AnamnesesEntry;
  isSelected: boolean;
  onSelect: () => void;
}

export const EntryCard = ({ entry, isSelected, onSelect }: EntryCardProps) => {
  const isExpired = entry.expires_at && new Date(entry.expires_at) < new Date();
  
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1">
              <EntryStatusIcon status={entry.status || ""} />
              <p className="font-medium">{entry.patient_email || `Anamnes #${entry.id.substring(0, 8)}`}</p>
            </div>
            <div className="flex justify-between items-center mt-1">
              <p className="text-sm text-muted-foreground">
                {entry.sent_at 
                  ? `Skickad: ${formatDate(entry.sent_at)}` 
                  : `Skapad: ${formatDate(entry.created_at || "")}`}
              </p>
              <EntryStatusBadge status={entry.status || ""} isExpired={isExpired} />
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
