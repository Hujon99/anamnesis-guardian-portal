
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const LoadingState = () => {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-center">Hämtar anamneser...</p>
        <p className="text-xs text-muted-foreground text-center">
          Detta kan ta en stund om du nyligen loggade in
        </p>
      </CardContent>
    </Card>
  );
};
