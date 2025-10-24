/**
 * Question Preset Manager Component
 * Manages question presets for forms, particularly useful for CISS forms
 * where all questions share the same answer options and scoring configuration.
 * Allows users to define reusable question templates that can be applied when adding new questions.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Edit2, Save, X, GripVertical } from 'lucide-react';
import { QuestionPreset } from '@/types/anamnesis';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface QuestionPresetManagerProps {
  presets: QuestionPreset[];
  onUpdate: (presets: QuestionPreset[]) => void;
}

export const QuestionPresetManager: React.FC<QuestionPresetManagerProps> = ({
  presets,
  onUpdate
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const [newPreset, setNewPreset] = useState<QuestionPreset>({
    name: '',
    type: 'dropdown',
    options: [''],
    scoring: {
      enabled: true,
      min_value: 0,
      max_value: 4
    }
  });

  const handleAddPreset = () => {
    if (!newPreset.name.trim() || newPreset.options.filter(o => o.trim()).length === 0) {
      return;
    }

    const cleanedPreset = {
      ...newPreset,
      name: newPreset.name.trim(),
      options: newPreset.options.filter(o => o.trim())
    };

    onUpdate([...presets, cleanedPreset]);
    setNewPreset({
      name: '',
      type: 'dropdown',
      options: [''],
      scoring: {
        enabled: true,
        min_value: 0,
        max_value: 4
      }
    });
    setIsCreating(false);
  };

  const handleUpdatePreset = (index: number, updatedPreset: QuestionPreset) => {
    const updated = [...presets];
    updated[index] = updatedPreset;
    onUpdate(updated);
    setEditingIndex(null);
  };

  const handleDeletePreset = (index: number) => {
    const updated = presets.filter((_, i) => i !== index);
    onUpdate(updated);
    setDeletingIndex(null);
  };

  const handleAddOption = (presetState: QuestionPreset, setPresetState: (p: QuestionPreset) => void) => {
    setPresetState({
      ...presetState,
      options: [...presetState.options, '']
    });
  };

  const handleUpdateOption = (
    presetState: QuestionPreset, 
    setPresetState: (p: QuestionPreset) => void,
    optionIndex: number, 
    value: string
  ) => {
    const updatedOptions = [...presetState.options];
    updatedOptions[optionIndex] = value;
    setPresetState({
      ...presetState,
      options: updatedOptions
    });
  };

  const handleRemoveOption = (
    presetState: QuestionPreset, 
    setPresetState: (p: QuestionPreset) => void,
    optionIndex: number
  ) => {
    if (presetState.options.length <= 1) return;
    
    const updatedOptions = presetState.options.filter((_, i) => i !== optionIndex);
    setPresetState({
      ...presetState,
      options: updatedOptions
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Frågemallar</h4>
          <p className="text-sm text-muted-foreground">
            Skapa återanvändbara mallar för frågor med samma alternativ
          </p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Ny mall
          </Button>
        )}
      </div>

      {/* Existing Presets */}
      {presets.length > 0 && (
        <div className="space-y-2">
          {presets.map((preset, index) => (
            <Card key={index} className="border-l-4 border-l-accent">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Collapsible 
                    open={expandedIndex === index} 
                    onOpenChange={(open) => setExpandedIndex(open ? index : null)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        {expandedIndex === index ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </Button>
                    </CollapsibleTrigger>
                  </Collapsible>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium">{preset.name}</h5>
                      <Badge variant="outline" className="text-xs">
                        {preset.type === 'dropdown' ? 'Dropdown' : 
                         preset.type === 'radio' ? 'Radio' : 'Kryssrutor'}
                      </Badge>
                      {preset.scoring?.enabled && (
                        <Badge variant="secondary" className="text-xs">
                          Poäng {preset.scoring.min_value}-{preset.scoring.max_value}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {preset.options.length} alternativ
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingIndex(index)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingIndex(index)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <Collapsible 
                open={expandedIndex === index}
                onOpenChange={(open) => setExpandedIndex(open ? index : null)}
              >
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                      <Label className="text-xs text-muted-foreground">Alternativ:</Label>
                      {preset.options.map((option, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2 pl-4">
                          <span className="text-muted-foreground">{optIdx + 1}.</span>
                          <span>{option}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      {/* Create New Preset */}
      {isCreating && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">Skapa ny mall</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Mallnamn</Label>
              <Input
                value={newPreset.name}
                onChange={(e) => setNewPreset({ ...newPreset, name: e.target.value })}
                placeholder="t.ex. CISS 5-skalig frekvens"
              />
            </div>

            <div className="space-y-2">
              <Label>Frågetyp</Label>
              <Select
                value={newPreset.type}
                onValueChange={(value: any) => setNewPreset({ ...newPreset, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dropdown">Dropdown</SelectItem>
                  <SelectItem value="radio">Radioknappar</SelectItem>
                  <SelectItem value="checkbox">Kryssrutor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Alternativ (inkludera poäng i parenteser)</Label>
              {newPreset.options.map((option, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-muted-foreground w-6">{idx + 1}.</span>
                  <Input
                    value={option}
                    onChange={(e) => handleUpdateOption(newPreset, setNewPreset, idx, e.target.value)}
                    placeholder={`Alternativ ${idx + 1} (${idx})`}
                  />
                  {newPreset.options.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveOption(newPreset, setNewPreset, idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddOption(newPreset, setNewPreset)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Lägg till alternativ
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Poängsättning</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Min-värde</Label>
                  <Input
                    type="number"
                    value={newPreset.scoring?.min_value || 0}
                    onChange={(e) => setNewPreset({
                      ...newPreset,
                      scoring: {
                        ...newPreset.scoring!,
                        min_value: parseInt(e.target.value) || 0
                      }
                    })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Max-värde</Label>
                  <Input
                    type="number"
                    value={newPreset.scoring?.max_value || 4}
                    onChange={(e) => setNewPreset({
                      ...newPreset,
                      scoring: {
                        ...newPreset.scoring!,
                        max_value: parseInt(e.target.value) || 4
                      }
                    })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Alternativ kommer automatiskt få poäng från min till max i ordning
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Avbryt
              </Button>
              <Button onClick={handleAddPreset}>
                <Save className="h-4 w-4 mr-2" />
                Spara mall
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Preset Dialog */}
      {editingIndex !== null && (
        <PresetEditDialog
          preset={presets[editingIndex]}
          onSave={(updated) => handleUpdatePreset(editingIndex, updated)}
          onCancel={() => setEditingIndex(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingIndex !== null} onOpenChange={(open) => !open && setDeletingIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort frågemall</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort mallen "{deletingIndex !== null ? presets[deletingIndex]?.name : ''}"?
              Detta påverkar inte befintliga frågor som skapats med denna mall.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingIndex !== null && handleDeletePreset(deletingIndex)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Separate dialog component for editing presets
const PresetEditDialog: React.FC<{
  preset: QuestionPreset;
  onSave: (preset: QuestionPreset) => void;
  onCancel: () => void;
}> = ({ preset, onSave, onCancel }) => {
  const [editedPreset, setEditedPreset] = useState<QuestionPreset>(preset);

  const handleAddOption = () => {
    setEditedPreset({
      ...editedPreset,
      options: [...editedPreset.options, '']
    });
  };

  const handleUpdateOption = (idx: number, value: string) => {
    const updated = [...editedPreset.options];
    updated[idx] = value;
    setEditedPreset({ ...editedPreset, options: updated });
  };

  const handleRemoveOption = (idx: number) => {
    if (editedPreset.options.length <= 1) return;
    setEditedPreset({
      ...editedPreset,
      options: editedPreset.options.filter((_, i) => i !== idx)
    });
  };

  return (
    <AlertDialog open={true} onOpenChange={onCancel}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Redigera frågemall</AlertDialogTitle>
        </AlertDialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Mallnamn</Label>
            <Input
              value={editedPreset.name}
              onChange={(e) => setEditedPreset({ ...editedPreset, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Frågetyp</Label>
            <Select
              value={editedPreset.type}
              onValueChange={(value: any) => setEditedPreset({ ...editedPreset, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dropdown">Dropdown</SelectItem>
                <SelectItem value="radio">Radioknappar</SelectItem>
                <SelectItem value="checkbox">Kryssrutor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Alternativ</Label>
            {editedPreset.options.map((option, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-muted-foreground w-6">{idx + 1}.</span>
                <Input
                  value={option}
                  onChange={(e) => handleUpdateOption(idx, e.target.value)}
                />
                {editedPreset.options.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveOption(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddOption}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Lägg till alternativ
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Poängsättning</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Min-värde</Label>
                <Input
                  type="number"
                  value={editedPreset.scoring?.min_value || 0}
                  onChange={(e) => setEditedPreset({
                    ...editedPreset,
                    scoring: {
                      ...editedPreset.scoring!,
                      min_value: parseInt(e.target.value) || 0
                    }
                  })}
                />
              </div>
              <div>
                <Label className="text-xs">Max-värde</Label>
                <Input
                  type="number"
                  value={editedPreset.scoring?.max_value || 4}
                  onChange={(e) => setEditedPreset({
                    ...editedPreset,
                    scoring: {
                      ...editedPreset.scoring!,
                      max_value: parseInt(e.target.value) || 4
                    }
                  })}
                />
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Avbryt</AlertDialogCancel>
          <AlertDialogAction onClick={() => onSave(editedPreset)}>
            Spara ändringar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
