
/**
 * Component that displays and allows quick editing of reference numbers.
 * Shows the patient identifier prominently and provides inline editing functionality.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Edit2, Check, X, Hash } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface ReferenceNumberDisplayProps {
  patientIdentifier: string;
  entryId: string;
  onSave: (entryId: string, newIdentifier: string) => Promise<void>;
  isReadOnly?: boolean;
  compact?: boolean;
}

export const ReferenceNumberDisplay = ({
  patientIdentifier,
  entryId,
  onSave,
  isReadOnly = false,
  compact = false
}: ReferenceNumberDisplayProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(patientIdentifier);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (editValue.trim() === patientIdentifier) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      await onSave(entryId, editValue.trim());
      setIsEditing(false);
      
      toast({
        title: "Referensnummer uppdaterat",
        description: "Ändringen har sparats",
      });
    } catch (error) {
      console.error("Error saving reference number:", error);
      toast({
        title: "Fel vid sparande",
        description: "Kunde inte spara referensnumret",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(patientIdentifier);
    setIsEditing(false);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsEditing(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div 
        className="flex items-center gap-1"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Referensnummer..."
          className="h-6 text-xs min-w-[120px] max-w-[160px]"
          autoFocus
          disabled={isSaving}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Check className="h-3 w-3 text-green-600" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X className="h-3 w-3 text-gray-500" />
        </Button>
      </div>
    );
  }

  if (!patientIdentifier) {
    if (isReadOnly) {
      return (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          <Hash className="h-3 w-3 mr-1" />
          Ingen referens
        </Badge>
      );
    }

    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
        onClick={handleEdit}
      >
        <Hash className="h-3 w-3 mr-1" />
        Lägg till referens
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Badge 
        variant="secondary" 
        className={`flex items-center gap-1 ${compact ? 'text-xs' : ''} bg-blue-50 text-blue-700 border-blue-200`}
      >
        <Hash className="h-3 w-3" />
        <span className="max-w-[120px] truncate">{patientIdentifier}</span>
      </Badge>
      {!isReadOnly && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 opacity-60 hover:opacity-100"
          onClick={handleEdit}
          title="Redigera referensnummer"
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};
