
/**
 * This component provides a dropdown for quickly assigning opticians to anamnesis entries
 * directly from the list view.
 */

import { useState, useEffect } from "react";
import { Check, ChevronDown, Loader2, User } from "lucide-react";
import { useOpticians } from "@/hooks/useOpticians";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth, useUser } from "@clerk/clerk-react";
import { toast } from "@/components/ui/use-toast";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { debugSupabaseAuth } from "@/integrations/supabase/client";

interface QuickAssignDropdownProps {
  entryId: string;
  currentOpticianId: string | null;
  onAssign: (opticianId: string | null) => Promise<void>;
  disabled?: boolean;
}

export function QuickAssignDropdown({
  entryId,
  currentOpticianId,
  onAssign,
  disabled = false,
}: QuickAssignDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const { opticians, isLoading } = useOpticians();
  const { has } = useAuth();
  const { user } = useUser();
  const { validateTokenBeforeRequest, refreshClient } = useSupabaseClient();
  
  // Check if user is admin
  const isAdmin = has && has({ role: "org:admin" });
  
  // Ensure token is valid on component mount and before dropdown opens
  useEffect(() => {
    // Silently validate token on mount
    validateTokenBeforeRequest(false).catch(err => 
      console.error("Background token validation failed:", err)
    );
  }, []); // Only run once on mount
  
  // Pre-validate token before opening dropdown
  const handleOpenChange = async (open: boolean) => {
    if (open && !isOpen) {
      try {
        // Before opening dropdown, validate token
        await validateTokenBeforeRequest(false);
        
        // Debug current auth state to help troubleshoot
        if (open) {
          await debugSupabaseAuth();
        }
      } catch (error) {
        console.error("Token validation failed on dropdown open:", error);
        // Still allow dropdown to open - we'll handle errors during assignment
      }
    }
    setIsOpen(open);
  };
  
  // Helper to validate UUID format
  const isValidUuid = (id: string | null): boolean => {
    if (!id) return true; // null is valid for unassigning
    
    // Reject Clerk user IDs
    if (id.startsWith('user_')) {
      console.error('Invalid format: Clerk user ID detected:', id);
      return false;
    }
    
    // Check UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isValid = uuidRegex.test(id);
    
    if (!isValid) {
      console.error('Invalid UUID format:', id);
    }
    
    return isValid;
  };
  
  // Handle optician assignment with improved error recovery
  const handleAssign = async (opticianId: string | null) => {
    if (disabled || isPending) return;
    
    // Log assignment attempt for debugging
    console.log(`Attempting to assign optician ID: ${opticianId || 'none'} to entry ${entryId}`);
    
    // Validate UUID format immediately
    if (opticianId !== null && !isValidUuid(opticianId)) {
      toast({
        title: "Ogiltig optiker-ID",
        description: "Ett fel uppstod med optiker-ID formatet. Försök igen.",
        variant: "destructive",
      });
      return;
    }
    
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        setIsPending(true);
        
        // First ensure token is valid before making request
        await validateTokenBeforeRequest(true);
        
        if (opticianId !== null) {
          // Double-check UUID format to be extra safe
          if (!isValidUuid(opticianId)) {
            throw new Error("Ogiltig optiker-ID format");
          }
          
          // Verify the optician exists in our list
          const validOptician = opticians.find(o => o.id === opticianId);
          if (!validOptician) {
            console.error(`Optician with ID ${opticianId} not found in list of ${opticians.length} opticians`);
            throw new Error("Ogiltig optiker vald");
          }
          
          // Log the successful validation
          console.log(`Verified optician ${opticianId} exists in list, proceeding with assignment`);
        }
        
        await onAssign(opticianId);
        
        // Show success message
        toast({
          title: opticianId ? "Optiker tilldelad" : "Tilldelning borttagen",
          description: opticianId 
            ? "Anamnesen har tilldelats en optiker" 
            : "Optikertilldelningen har tagits bort",
        });
        
        setIsOpen(false);
        break; // Success - exit retry loop
      } catch (error) {
        console.error(`Error assigning optician (attempt ${retryCount + 1}):`, error);
        
        // Check if it's a JWT-related error
        const isJwtError = error?.message?.includes("JWT") || 
                          error?.message?.includes("token") ||
                          error?.code === "PGRST301";
        
        if (isJwtError && retryCount < maxRetries) {
          // For JWT errors, try to refresh token and retry
          retryCount++;
          setIsPending(true);
          
          try {
            // Force token refresh
            await refreshClient(true);
            // Small delay before retry
            await new Promise(r => setTimeout(r, 500));
            console.log(`Retrying assignment after token refresh (attempt ${retryCount})`);
            continue; // Try again
          } catch (refreshError) {
            console.error("Token refresh failed during retry:", refreshError);
          }
        }
        
        // Show error message only for final failure or non-JWT errors
        toast({
          title: "Fel vid tilldelning",
          description: error?.message || "Det gick inte att tilldela optikern. Försök igen.",
          variant: "destructive",
        });
        
        break; // Exit retry loop on non-JWT error or max retries reached
      } finally {
        setIsPending(false);
      }
    }
  };

  // Get currently selected optician name
  const selectedOptician = opticians.find(o => o.id === currentOpticianId);
  
  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild disabled={disabled || isPending}>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 h-7 px-2"
          disabled={disabled || isPending}
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <User className="h-3 w-3 mr-1" />
          )}
          <span className="max-w-[100px] truncate">
            {selectedOptician ? selectedOptician.name : "Tilldela"}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        {isLoading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="ml-2">Laddar...</span>
          </div>
        ) : opticians.length === 0 ? (
          <div className="px-2 py-2 text-sm text-muted-foreground">
            Inga optiker tillgängliga
          </div>
        ) : (
          <>
            {opticians.map((optician) => (
              <DropdownMenuItem
                key={optician.id}
                onClick={() => handleAssign(optician.id)}
                disabled={isPending}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{optician.name || optician.email || optician.id}</span>
                  {optician.id === currentOpticianId && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            
            {isAdmin && currentOpticianId && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleAssign(null)}
                  disabled={isPending}
                  className="text-destructive focus:text-destructive"
                >
                  Ta bort tilldelning
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
