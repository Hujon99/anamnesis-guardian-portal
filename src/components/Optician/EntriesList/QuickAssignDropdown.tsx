
/**
 * This component provides a dropdown for quickly assigning opticians to anamnesis entries
 * directly from the list view. It handles the conversion between Clerk user IDs and Supabase UUIDs.
 */

import { useState } from "react";
import { Check, ChevronDown, Loader2, User } from "lucide-react";
import { useOpticians, Optician } from "@/hooks/useOpticians";
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
import { isValidUUID } from "@/utils/idConversionUtils";

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
  
  // Check if user is admin
  const isAdmin = has && has({ role: "org:admin" });
  
  // Handle optician assignment - with type safety
  const handleAssign = async (opticianId: string | null) => {
    setIsPending(true);
    
    try {
      // Validate UUID format if an ID is provided
      if (opticianId !== null) {
        if (!isValidUUID(opticianId)) {
          console.error(`Invalid optician ID format (not a UUID): ${opticianId}`);
          throw new Error(`Invalid optician ID format: Expected UUID but received ${opticianId}`);
        }
      }
      
      console.log(`Assigning optician with ID: ${opticianId} to entry ${entryId}`);
      await onAssign(opticianId);
      
      // Show success message
      toast({
        title: opticianId ? "Optiker tilldelad" : "Tilldelning borttagen",
        description: opticianId 
          ? "Anamnesen har tilldelats en optiker" 
          : "Optikertilldelningen har tagits bort",
      });
      
      setIsOpen(false);
    } catch (error) {
      console.error("Error assigning optician:", error);
      
      // Determine the specific error message
      let errorMessage = "Det gick inte att tilldela optikern";
      if (error instanceof Error) {
        if (error.message.includes("UUID")) {
          errorMessage = "ID-formatet är ogiltigt. Kontakta support.";
        }
      }
      
      toast({
        title: "Fel vid tilldelning",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  // Get currently selected optician name
  const selectedOptician = opticians.find(o => o.id === currentOpticianId);
  
  // Log opticians for debugging
  if (opticians.length > 0 && !isLoading) {
    console.log("Available opticians in dropdown:", opticians.map(o => ({ 
      id: o.id, 
      clerk_user_id: o.clerk_user_id,
      name: o.name || 'Unnamed'
    })));
  }
  
  // Helper function to get display name
  const getOpticianDisplayName = (optician: Optician | undefined): string => {
    if (!optician) return "Tilldela";
    return optician.name || optician.email || "Optiker";
  };
  
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
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
            {getOpticianDisplayName(selectedOptician)}
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
                  <span>{getOpticianDisplayName(optician)}</span>
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
