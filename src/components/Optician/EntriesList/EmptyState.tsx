
/**
 * This component displays an empty state message when no anamnesis entries are available.
 * It provides different messages based on the status type provided.
 */

import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  status: string;
}

export const EmptyState = ({ status }: EmptyStateProps) => {
  const getMessage = () => {
    switch (status) {
      case "sent":
        return "Inga skickade anamneser";
      case "pending":
        return "Inga anamneser att granska";
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
    <Card>
      <CardContent className="pt-6">
        <p className="text-center text-muted-foreground">
          {getMessage()}
        </p>
      </CardContent>
    </Card>
  );
};
