
/**
 * This component provides a button for administrators to manually trigger 
 * user synchronization between Clerk and Supabase. It displays the current
 * synchronization status and the timestamp of the last successful sync.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSyncClerkUsers } from "@/hooks/useSyncClerkUsers";
import { useUserSyncStore } from "@/hooks/useUserSyncStore";
import { useOrganization } from "@clerk/clerk-react";
import { Loader2, RefreshCw, Check, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";

export function UserSyncButton() {
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const { organization } = useOrganization();
  const { syncUsersWithToast } = useSyncClerkUsers();
  const { toast } = useToast();
  
  const { 
    getSyncStatus,
    getLastSynced
  } = useUserSyncStore();
  
  // Get sync status for current organization
  const currentOrgId = organization?.id || '';
  const syncStatus = getSyncStatus(currentOrgId);
  const lastSynced = getLastSynced(currentOrgId);
  
  const handleManualSync = async () => {
    if (!organization?.id || isManualSyncing) return;
    
    setIsManualSyncing(true);
    try {
      await syncUsersWithToast();
    } catch (error) {
      console.error("Error during manual sync:", error);
      toast({
        title: "Synkroniseringsfel",
        description: "Ett fel uppstod vid synkronisering av användare.",
        variant: "destructive",
      });
    } finally {
      setIsManualSyncing(false);
    }
  };
  
  // Determine button state and icon
  const getButtonState = () => {
    if (isManualSyncing || syncStatus === 'syncing') {
      return {
        text: "Synkroniserar...",
        icon: <Loader2 className="h-4 w-4 mr-2 animate-spin" />,
        disabled: true,
        variant: "outline" as const
      };
    }
    
    if (syncStatus === 'error') {
      return {
        text: "Synkronisera användare",
        icon: <AlertCircle className="h-4 w-4 mr-2 text-destructive" />,
        disabled: false,
        variant: "outline" as const
      };
    }
    
    if (syncStatus === 'synced') {
      return {
        text: "Synkronisera användare",
        icon: <Check className="h-4 w-4 mr-2 text-green-500" />,
        disabled: false,
        variant: "outline" as const
      };
    }
    
    return {
      text: "Synkronisera användare",
      icon: <RefreshCw className="h-4 w-4 mr-2" />,
      disabled: false,
      variant: "outline" as const
    };
  };
  
  const buttonState = getButtonState();
  
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={buttonState.variant}
        disabled={buttonState.disabled}
        onClick={handleManualSync}
        className="flex items-center"
      >
        {buttonState.icon}
        {buttonState.text}
      </Button>
      
      {lastSynced && (
        <p className="text-xs text-gray-500">
          Senast synkroniserad: {format(lastSynced, "d MMM yyyy HH:mm", { locale: sv })}
        </p>
      )}
    </div>
  );
}
