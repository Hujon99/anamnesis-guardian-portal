
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <Card className="w-full max-w-3xl bg-white/95 backdrop-blur-sm shadow-lg/20 rounded-2xl border-white/60">
        <CardContent className="space-y-6 pt-6 flex flex-col items-center justify-center">
          <div className="animate-pulse flex flex-col items-center space-y-4">
            <div className="h-12 w-12 bg-primary/20 rounded-full"></div>
            <div className="h-4 w-48 bg-primary/20 rounded"></div>
            <div className="h-3 w-64 bg-gray-200 rounded"></div>
          </div>
          <p className="text-gray-500 text-center mt-4">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
};
