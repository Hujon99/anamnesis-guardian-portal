
import { Button } from "@/components/ui/button";
import { useOrganization } from "@clerk/clerk-react";
import { Loader2 } from "lucide-react";

interface DashboardHeaderProps {
  showRetryButton: boolean;
  onRetry: () => void;
}

export const DashboardHeader = ({ showRetryButton, onRetry }: DashboardHeaderProps) => {
  const { organization } = useOrganization();

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">
          Organisation: {organization?.name}
        </p>
      </div>
      
      {showRetryButton && (
        <Button variant="outline" onClick={onRetry}>
          <Loader2 className="mr-2 h-4 w-4" />
          Försök igen
        </Button>
      )}
    </div>
  );
};
