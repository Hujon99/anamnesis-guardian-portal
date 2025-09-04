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
  onConfirm: (firstName: string, lastName: string) => void;
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const handleConfirm = () => {
    onConfirm(firstName.trim(), lastName.trim());
  };

  const handleCancel = () => {
    setFirstName("");
    setLastName("");
    onOpenChange(false);
  };

  const isValid = firstName.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <DialogTitle>Lägg till kundinfo</DialogTitle>
          </div>
          <DialogDescription>
            Ange kundens namn för {examinationType.toLowerCase()}undersökningen.
            Förnamn krävs, efternamn är valfritt.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="firstName">Förnamn *</Label>
            <Input
              id="firstName"
              placeholder="Ange förnamn"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isCreating}
              autoFocus
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="lastName">Efternamn</Label>
            <Input
              id="lastName"
              placeholder="Ange efternamn (valfritt)"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isCreating}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isCreating}
          >
            Avbryt
          </Button>
          
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isCreating}
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