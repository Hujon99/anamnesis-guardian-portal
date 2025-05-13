
/**
 * This component provides a dropdown for assigning or unassigning opticians to anamnesis entries.
 * It displays a list of opticians in the organization and allows authorized users to make assignments.
 */

import { useState, useEffect } from 'react';
import { useUser, useOrganization } from '@clerk/clerk-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, User } from 'lucide-react';
import { useOpticians } from '@/hooks/useOpticians';
import { Skeleton } from '@/components/ui/skeleton';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';
import { toast } from '@/components/ui/use-toast';

interface OpticianSelectorProps {
  currentOpticianId: string | null;
  onAssignOptician: (opticianId: string | null) => Promise<void>;
  disabled?: boolean;
}

export function OpticianSelector({
  currentOpticianId,
  onAssignOptician,
  disabled = false
}: OpticianSelectorProps) {
  const { user } = useUser();
  const { organization } = useOrganization();
  const { opticians, isLoading } = useOpticians();
  const [isPending, setIsPending] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const { validateTokenBeforeRequest } = useSupabaseClient();
  
  // Check if user has permission to assign opticians - check organization roles
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user || !organization) {
        setHasPermission(false);
        return;
      }

      try {
        const members = await organization.getMemberships();
        const isAdmin = members.data?.some(member => 
          member.publicUserData?.userId === user.id && 
          (member.role === 'admin' || member.role === 'org:admin')
        ) || false;
        
        setHasPermission(isAdmin);
      } catch (error) {
        console.error('Error checking permissions:', error);
        setHasPermission(false);
      }
    };

    checkPermissions();
  }, [user, organization]);
  
  // Pre-validate token on component mount
  useEffect(() => {
    validateTokenBeforeRequest(false).catch(err => {
      console.error("Background token validation failed:", err);
    });
  }, [validateTokenBeforeRequest]);
  
  // Find the name of the currently assigned optician if any
  const currentOptician = opticians.find(opt => opt.id === currentOpticianId);
  const currentOpticianLabel = currentOptician?.name || currentOptician?.email || 'Ingen optiker tilldelad';
  
  const handleOpticianChange = async (value: string) => {
    if (disabled || !hasPermission || isPending) return;
    
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        setIsPending(true);
        
        // Ensure the Supabase client has a valid token
        await validateTokenBeforeRequest(true);
        
        // Handle "none" value to unassign
        if (value === 'none') {
          await onAssignOptician(null);
        } else {
          // Check if value is a Clerk user ID instead of database UUID
          if (value.startsWith("user_")) {
            throw new Error("Invalid optician ID format: Clerk user ID passed instead of database UUID");
          }
          
          // Verify valid optician ID
          const validOptician = opticians.find(opt => opt.id === value);
          if (!validOptician) {
            throw new Error("Invalid optician selected");
          }
          await onAssignOptician(value);
        }

        toast({
          title: value !== 'none' ? "Optiker tilldelad" : "Tilldelning borttagen",
          description: value !== 'none' 
            ? "Anamnesen har tilldelats en optiker" 
            : "Optikertilldelningen har tagits bort"
        });
        
        break; // Success - exit retry loop
      } catch (error) {
        console.error(`Failed to assign optician (attempt ${retryCount + 1}):`, error);
        
        // Check if it's a JWT-related error
        const isJwtError = error?.message?.includes("JWT") || 
                          error?.message?.includes("token") ||
                          error?.code === "PGRST301";
        
        if (isJwtError && retryCount < maxRetries) {
          // For JWT errors, try to retry
          retryCount++;
          
          try {
            // Force token refresh and wait a moment
            await validateTokenBeforeRequest(true);
            await new Promise(r => setTimeout(r, 500));
            console.log(`Retrying assignment after token refresh (attempt ${retryCount})`);
            continue; // Try again
          } catch (refreshError) {
            console.error("Token refresh failed during retry:", refreshError);
          }
        }
        
        // Show error message for final failure
        toast({
          title: "Fel vid tilldelning",
          description: "Det gick inte att tilldela optikern",
          variant: "destructive",
        });
        
        break; // Exit retry loop
      } finally {
        setIsPending(false);
      }
    }
  };
  
  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }
  
  if (!hasPermission) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <User className="h-4 w-4" />
        <span>Optiker: {currentOpticianLabel}</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Tilldela optiker</label>
      <Select
        disabled={disabled || isPending}
        value={currentOpticianId || 'none'}
        onValueChange={handleOpticianChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Välj optiker">
            {isPending ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Tilldelar...
              </div>
            ) : (
              currentOpticianLabel
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Ingen optiker tilldelad</SelectItem>
          {opticians.map((optician) => (
            <SelectItem key={optician.id} value={optician.id}>
              {optician.name || optician.email || 'Okänd optiker'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
