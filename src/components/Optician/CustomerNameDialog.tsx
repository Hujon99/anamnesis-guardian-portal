/**
 * CustomerNameDialog provides a modal for opticians to enter customer names when creating
 * direct in-store forms. This appears after examination type selection and before form
 * creation, allowing proper patient identification for walk-in customers.
 */

import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Loader2 } from "lucide-react";

interface CustomerNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string) => void;
  isCreating: boolean;
  examinationType: string;
}

export const CustomerNameDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isCreating,
  examinationType
}: CustomerNameDialogProps) => {
  const [name, setName] = useState("");

  const handleConfirm = () => {
    onConfirm(name.trim());
  };

  const handleCancel = () => {
    setName("");
    onOpenChange(false);
  };

  const isValid = name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[480px] p-8">
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl">Lägg till kundinfo</DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed">
            Ange kundens namn för {examinationType.toLowerCase()}undersökningen.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-6">
          <div className="grid gap-3">
            <Label htmlFor="name" className="text-base">Namn *</Label>
            <Input
              id="name"
              placeholder="Ange kundens fullständiga namn"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isCreating}
              autoFocus
              className="h-12 text-base"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-4 pt-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isCreating}
            className="px-6 py-3"
          >
            Avbryt
          </Button>
          
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isCreating}
            className="px-6 py-3"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Skapar formulär...
              </>
            ) : (
              "Skapa formulär"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};