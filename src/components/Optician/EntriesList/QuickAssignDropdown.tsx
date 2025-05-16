
/**
 * This component provides a dropdown for quickly assigning opticians to anamnesis entries
 * directly from the list view.
 * Updated to work with Clerk user IDs instead of database UUIDs.
 */

import { useState } from "react";
import { Check, ChevronDown, Loader2, User } from "lucide-react";
import { useOpticians, getOpticianDisplayName } from "@/hooks/useOpticians";
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

interface QuickAssignDropdownProps {
  entryId: string;
  currentOpticianId?: string | null;
  onAssign: (opticianId: string | null) => Promise<void>;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function QuickAssignDropdown({
  entryId,
  currentOpticianId,
  onAssign,
  disabled = false,
  children
}: QuickAssignDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const { opticians, isLoading } = useOpticians();
  const { has } = useAuth();
  const { user } = useUser();
  
  // Check if user is admin
  const isAdmin = has && has({ role: "org:admin" });
  
  // Handle optician assignment
  const handleAssign = async (opticianId: string | null) => {
    setIsPending(true);
    
    try {
      // Validate Clerk user ID format if an ID is provided
      if (opticianId !== null && !opticianId.startsWith('user_')) {
        throw new Error(`Invalid optician ID format: ${opticianId}`);
      }
      
      console.log(`Assigning optician with ID: ${opticianId}`);
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
      
      toast({
        title: "Fel vid tilldelning",
        description: "Det gick inte att tilldela optikern",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  // Get currently selected optician name
  // We need to match by clerk_user_id since that's now stored in optician_id
  const selectedOptician = opticians.find(o => o.clerk_user_id === currentOpticianId);
  const selectedOpticianName = getOpticianDisplayName(selectedOptician);
  
  // Add a click handler to prevent event bubbling
  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild disabled={disabled || isPending} onClick={handleTriggerClick}>
        {children || (
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
              {selectedOptician ? selectedOpticianName : "Tilldela"}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        )}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56 bg-background">
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleAssign(optician.clerk_user_id);
                }}
                disabled={isPending}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{getOpticianDisplayName(optician)}</span>
                  {optician.clerk_user_id === currentOpticianId && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            
            {isAdmin && currentOpticianId && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAssign(null);
                  }}
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
