/**
 * Form Editor Component
 * Allows administrators to view and rename available forms.
 * Shows all forms with their current names and examination types,
 * providing inline editing capabilities for form titles.
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Edit2, Check, X, Loader2 } from 'lucide-react';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';
import { toast } from '@/hooks/use-toast';

interface FormEditorProps {
  forms: any[];
  onFormUpdated: () => void;
}

interface EditingForm {
  id: string;
  title: string;
}

const FormEditor: React.FC<FormEditorProps> = ({ forms, onFormUpdated }) => {
  const [editingForm, setEditingForm] = useState<EditingForm | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { supabase } = useSupabaseClient();

  const handleStartEdit = (form: any) => {
    setEditingForm({ id: form.id, title: form.title });
  };

  const handleCancelEdit = () => {
    setEditingForm(null);
  };

  const handleSaveEdit = async () => {
    if (!editingForm || !supabase) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('anamnes_forms')
        .update({ title: editingForm.title })
        .eq('id', editingForm.id);

      if (error) throw error;

      toast({
        title: "Formulär uppdaterat",
        description: "Formulärets namn har uppdaterats framgångsrikt",
      });

      setEditingForm(null);
      onFormUpdated();
    } catch (error) {
      console.error('Error updating form:', error);
      toast({
        title: "Fel uppstod",
        description: "Kunde inte uppdatera formulärets namn",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTitleChange = (title: string) => {
    if (editingForm) {
      setEditingForm({ ...editingForm, title });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Tillgängliga formulär
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {forms.map((form) => {
            const isEditing = editingForm?.id === form.id;
            
            return (
              <div key={form.id} className="flex items-center justify-between p-4 rounded-lg border bg-surface-light/30">
                <div className="flex-1 space-y-2">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingForm.title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        className="flex-1"
                        placeholder="Formulärnamn"
                        disabled={isUpdating}
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={isUpdating || !editingForm.title.trim()}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={isUpdating}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{form.title}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStartEdit(form)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {form.examination_type && (
                    <Badge variant="secondary" className="text-xs">
                      {form.examination_type}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default FormEditor;