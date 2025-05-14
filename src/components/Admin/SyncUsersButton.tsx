
/**
 * This component provides a button to manually trigger synchronization between Clerk and Supabase.
 * It allows administrators to ensure that all organization members have corresponding records in the database.
 * The component displays the sync status and provides visual feedback during the operation.
 */

import { useState } from "react";
import { useSyncClerkUsers } from "@/hooks/useSyncClerkUsers";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface SyncUsersButtonProps {
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  showStatus?: boolean;
  buttonText?: string;
}

export function SyncUsersButton({
  variant = "default",
  size = "default",
  showStatus = false,
  buttonText = "Synka användare"
}: SyncUsersButtonProps) {
  const { syncUsersWithToast, isSyncing, lastSyncedAt } = useSyncClerkUsers();
  const [expanded, setExpanded] = useState(false);
  
  // Force a full refresh with token refresh
  const handleSync = async () => {
    try {
      const result = await syncUsersWithToast();
      if (result.success) {
        console.log("Sync completed successfully:", result.message);
      } else {
        console.error("Sync failed:", result.message);
      }
    } catch (error) {
      console.error("Error during sync:", error);
      toast({
        title: "Synkroniseringsfel",
        description: "Ett oväntat fel uppstod under synkronisering. Försök igen.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant={variant}
        size={size}
        disabled={isSyncing}
        onClick={handleSync}
        className="relative"
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
        <span>{buttonText}</span>
      </Button>
      
      {showStatus && lastSyncedAt && (
        <div 
          className="text-xs text-muted-foreground cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          Senast synkad: {lastSyncedAt.toLocaleTimeString()}
          {expanded && (
            <div className="mt-1">
              {lastSyncedAt.toLocaleDateString()} {lastSyncedAt.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
