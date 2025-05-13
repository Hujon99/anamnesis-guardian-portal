
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
      } catch (error) {
        console.error("Token validation failed on dropdown open:", error);
        // Still allow dropdown to open - we'll handle errors during assignment
      }
    }
    setIsOpen(open);
  };
  
  // Handle optician assignment with improved error recovery
  const handleAssign = async (opticianId: string | null) => {
    if (disabled || isPending) return;
    
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        setIsPending(true);
        
        // First ensure token is valid before making request
        await validateTokenBeforeRequest(true);
        
        // Make sure the opticianId is valid
        if (opticianId !== null) {
          const validOptician = opticians.find(o => o.id === opticianId);
          if (!validOptician) {
            throw new Error("Ogiltig optiker vald");
          }
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
          description: "Det gick inte att tilldela optikern. Försök igen.",
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
                  <span>{optician.name}</span>
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
