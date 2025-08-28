/**
 * ExaminationTypeSelector provides a modal dialog for selecting examination types
 * when creating direct in-store forms. It displays all available form types for
 * the organization with icons, descriptions, and selection buttons. Used by
 * DirectFormButton to allow opticians to choose the appropriate examination type.
 */

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { OrganizationForm, useOrganizationForms } from "@/hooks/useOrganizationForms";
import * as LucideIcons from "lucide-react";

interface ExaminationTypeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (form: OrganizationForm) => void;
  isCreating?: boolean;
}

export const ExaminationTypeSelector: React.FC<ExaminationTypeSelectorProps> = ({
  open,
  onOpenChange,
  onSelect,
  isCreating = false
}) => {
  const { data: forms, isLoading, error } = useOrganizationForms();

  const getIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || LucideIcons.FileText;
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Välj undersökningstyp</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !forms || forms.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Välj undersökningstyp</DialogTitle>
          </DialogHeader>
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {error ? "Kunde inte ladda formulär" : "Inga formulär tillgängliga"}
            </p>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="mt-4"
            >
              Stäng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Välj undersökningstyp</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {forms.map((form) => {
            const IconComponent = getIcon(form.icon);
            
            return (
              <Card 
                key={form.id} 
                className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{form.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-sm text-muted-foreground mb-4">
                    {form.description}
                  </CardDescription>
                  <Button 
                    onClick={() => onSelect(form)}
                    disabled={isCreating}
                    className="w-full"
                    size="sm"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Skapar formulär...
                      </>
                    ) : (
                      "Välj denna typ"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};