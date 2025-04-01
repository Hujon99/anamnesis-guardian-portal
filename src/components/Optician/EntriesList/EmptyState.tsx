
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  status: string;
}

export const EmptyState = ({ status }: EmptyStateProps) => {
  const getMessage = () => {
    switch (status) {
      case "draft":
        return "Inga utkast";
      case "sent":
        return "Inga skickade anamneser";
      case "pending":
        return "Inga anamneser att granska";
      case "ready":
        return "Inga färdiga anamneser";
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
