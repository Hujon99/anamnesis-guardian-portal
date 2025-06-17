
/**
 * Loading state components for the optician form.
 * Provides different loading states for initialization, authentication, and form loading.
 */

import { Card, CardContent } from "@/components/ui/card";

interface OpticianFormLoadingProps {
  message: string;
}

export const OpticianFormLoading = ({ message }: OpticianFormLoadingProps) => {
  return (
    <Card className="w-full max-w-3xl mx-auto p-6">
      <CardContent className="space-y-6 pt-6 flex flex-col items-center justify-center">
        <div className="animate-pulse flex flex-col items-center space-y-4">
          <div className="h-12 w-12 bg-primary/20 rounded-full"></div>
          <div className="h-4 w-48 bg-primary/20 rounded"></div>
          <div className="h-3 w-64 bg-gray-200 rounded"></div>
        </div>
        <p className="text-gray-500 text-center mt-4">{message}</p>
      </CardContent>
    </Card>
  );
};
