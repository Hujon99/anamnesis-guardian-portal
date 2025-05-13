
/**
 * This component displays an empty state message when no anamnesis entries are available.
 * It provides different messages based on the status type provided.
 */

import { Card, CardContent } from "@/components/ui/card";
import { FolderX } from "lucide-react";

interface EmptyStateProps {
  status?: string;
}

export function EmptyState({ status = "pending" }: EmptyStateProps) {
  const getMessage = () => {
    switch (status) {
      case "pending":
        return "Inga väntande anamneser";
      case "sent":
        return "Inga utskickade anamneser";
      case "reviewed":
        return "Inga granskade anamneser";
      case "ready":
        return "Inga färdiga anamneser";
      case "all":
        return "Inga anamneser tillgängliga";
      case "assigned":
        return "Inga tilldelade anamneser";
      default:
        return "Inga anamneser";
    }
  };

  return (
    <Card className="w-full border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-10">
        <FolderX className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">{getMessage()}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Det finns inga anamneser att visa just nu
        </p>
      </CardContent>
    </Card>
  );
}
