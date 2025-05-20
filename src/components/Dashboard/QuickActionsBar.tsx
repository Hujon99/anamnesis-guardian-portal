
/**
 * Quick actions bar component that provides access to common actions in the dashboard.
 * It displays a stylized glass card with action buttons for creating orders, shipments, and scanning items.
 */

import React from 'react';
import { Button } from "@/components/ui/button";
import { Package, Plus, ScanBarcode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuickActionsBarProps {
  onScanClick: () => void;
}

export const QuickActionsBar = ({ onScanClick }: QuickActionsBarProps) => {
  const { toast } = useToast();
  
  const handleNewOrder = () => {
    toast({
      title: "Ny order",
      description: "Funktionen för att skapa ny order kommer snart",
    });
  };
  
  const handleCreateShipment = () => {
    toast({
      title: "Skapa sändning",
      description: "Funktionen för att skapa sändning kommer snart",
    });
  };
  
  return (
    <div className="sticky top-4 z-10 mb-6">
      <div className="rounded-2xl backdrop-blur-sm bg-background/70 border border-border/40 shadow-lg/20 py-3 px-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleNewOrder} 
            className="bg-primary hover:bg-primary/90 text-white flex gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Ny order</span>
          </Button>
          
          <Button
            onClick={handleCreateShipment}
            variant="outline"
            className="border-primary/20 hover:bg-primary/10 hover:text-primary flex gap-1.5"
          >
            <Package className="h-4 w-4" />
            <span>Skapa sändning</span>
          </Button>
          
          <Button
            onClick={onScanClick}
            variant="outline"
            className="border-accent_teal/30 hover:bg-accent_teal/10 hover:text-accent_teal flex gap-1.5"
          >
            <ScanBarcode className="h-4 w-4" />
            <span>Skanna inkommande</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
