/**
 * Main Form Builder Component
 * Split-screen interface for editing forms with real-time preview.
 * Provides comprehensive form creation and editing capabilities
 * with undo/redo, validation, and template integration.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Save, 
  Eye, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  Undo2, 
  Redo2,
  FileText,
  Plus
} from 'lucide-react';

import { FormTemplate } from '@/types/anamnesis';
import { EXAMINATION_TYPE_OPTIONS } from '@/types/examinationType';
import { useFormCRUD } from '@/hooks/useFormCRUD';
import { useFormValidation } from '@/hooks/useFormValidation';

import { SectionEditor } from './SectionEditor';
import { FormPreview } from './FormPreview';
import { ConditionalLogicEditor } from './ConditionalLogicEditor';

interface FormBuilderProps {
  formId?: string;
  initialForm?: {
    id?: string;
    title: string;
    examination_type: string;
    schema: FormTemplate;
  };
  onSave?: (form: any) => void;
  onClose?: () => void;
}

interface FormState {
  title: string;
  examination_type: string;
  schema: FormTemplate;
}

interface HistoryEntry {
  state: FormState;
  timestamp: number;
  action: string;
}

export const FormBuilder: React.FC<FormBuilderProps> = ({
  formId,
  initialForm,
  onSave,
  onClose
}) => {
  const [currentForm, setCurrentForm] = useState<FormState>(() => {
    if (initialForm) {
      return {
        title: initialForm.title,
        examination_type: initialForm.examination_type,
        schema: initialForm.schema
      };
    }
    return {
      title: '',
      examination_type: 'Synundersökning',
      schema: {
        title: '',
        sections: []
      }
    };
  });

  const [activeTab, setActiveTab] = useState('sections');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // History management for undo/redo
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const { createForm, updateForm, isLoading } = useFormCRUD();
  const { validateForm, validateFormMetadata, hasErrors, hasWarnings } = useFormValidation();

  // Add to history when form changes
  const addToHistory = useCallback((action: string) => {
    const newEntry: HistoryEntry = {
      state: structuredClone(currentForm),
      timestamp: Date.now(),
      action
    };

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newEntry);
      return newHistory.length > 50 ? newHistory.slice(-50) : newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [currentForm, historyIndex]);

  // Undo/Redo functions
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setCurrentForm(history[historyIndex - 1].state);
      setHasUnsavedChanges(true);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setCurrentForm(history[historyIndex + 1].state);
      setHasUnsavedChanges(true);
    }
  }, [history, historyIndex]);

  // Validation
  const validationErrors = useMemo(() => {
    const metadataErrors = validateFormMetadata(currentForm.title, currentForm.examination_type);
    const schemaErrors = validateForm(currentForm.schema);
    return [...metadataErrors, ...schemaErrors];
  }, [currentForm, validateForm, validateFormMetadata]);

  const canSave = !hasErrors(validationErrors) && hasUnsavedChanges && !isSaving;

  // Handle form updates
  const updateFormField = useCallback((field: keyof FormState, value: any) => {
    setCurrentForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'title') {
        updated.schema = { ...updated.schema, title: value };
      }
      return updated;
    });
    setHasUnsavedChanges(true);
  }, []);

  const updateSchema = useCallback((schema: FormTemplate) => {
    setCurrentForm(prev => ({ ...prev, schema }));
    setHasUnsavedChanges(true);
  }, []);

  // Save functionality
  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);
    try {
      if (formId) {
        await updateForm({
          id: formId,
          title: currentForm.title,
          examination_type: currentForm.examination_type,
          schema: currentForm.schema
        });
      } else {
        await createForm({
          title: currentForm.title,
          examination_type: currentForm.examination_type,
          schema: currentForm.schema
        });
      }
      
      setHasUnsavedChanges(false);
      onSave?.(currentForm);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey)) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            if (canSave) handleSave();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canSave, handleSave, undo, redo]);

  // Add new section
  const addSection = useCallback(() => {
    const newSection = {
      section_title: `Ny sektion ${currentForm.schema.sections.length + 1}`,
      questions: []
    };
    
    updateSchema({
      ...currentForm.schema,
      sections: [...currentForm.schema.sections, newSection]
    });
    
    addToHistory('Lade till sektion');
  }, [currentForm.schema, updateSchema, addToHistory]);

  return (
    <div className="h-screen flex flex-col bg-surface-light">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">
                {formId ? 'Redigera formulär' : 'Skapa nytt formulär'}
              </h1>
              {hasUnsavedChanges && (
                <p className="text-sm text-muted-foreground">Osparade ändringar</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Validation status */}
            {validationErrors.length > 0 && (
              <Badge variant={hasErrors(validationErrors) ? "destructive" : "secondary"}>
                {hasErrors(validationErrors) ? (
                  <>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {validationErrors.filter(e => e.type === 'error').length} fel
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {validationErrors.filter(e => e.type === 'warning').length} varningar
                  </>
                )}
              </Badge>
            )}
            
            {/* Undo/Redo */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={undo} 
              disabled={historyIndex <= 0}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={redo} 
              disabled={historyIndex >= history.length - 1}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            {/* Save */}
            <Button onClick={handleSave} disabled={!canSave} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? 'Sparar...' : 'Spara'}
            </Button>
            
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Stäng
              </Button>
            )}
          </div>
        </div>

        {/* Form metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="form-title">Formulärtitel</Label>
            <Input
              id="form-title"
              value={currentForm.title}
              onChange={(e) => updateFormField('title', e.target.value)}
              placeholder="Ange formulärtitel..."
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="examination-type">Undersökningstyp</Label>
            <Select
              value={currentForm.examination_type}
              onValueChange={(value) => updateFormField('examination_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXAMINATION_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.type} value={option.type}>
                    {option.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Editor panel */}
        <div className="w-1/2 border-r">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 m-4 mb-0">
              <TabsTrigger value="sections">Sektioner</TabsTrigger>
              <TabsTrigger value="logic">Villkorlig logik</TabsTrigger>
              <TabsTrigger value="settings">Inställningar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sections" className="flex-1 m-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Sektioner</h3>
                    <Button onClick={addSection} size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Lägg till sektion
                    </Button>
                  </div>
                  
                  {currentForm.schema.sections.map((section, index) => (
                    <SectionEditor
                      key={`section-${index}`}
                      section={section}
                      sectionIndex={index}
                      onUpdate={(updatedSection) => {
                        const updatedSections = [...currentForm.schema.sections];
                        updatedSections[index] = updatedSection;
                        updateSchema({
                          ...currentForm.schema,
                          sections: updatedSections
                        });
                        addToHistory(`Uppdaterade sektion ${index + 1}`);
                      }}
                      onDelete={() => {
                        const updatedSections = currentForm.schema.sections.filter((_, i) => i !== index);
                        updateSchema({
                          ...currentForm.schema,
                          sections: updatedSections
                        });
                        addToHistory(`Tog bort sektion ${index + 1}`);
                      }}
                    />
                  ))}
                  
                  {currentForm.schema.sections.length === 0 && (
                    <Card className="p-8 text-center">
                      <p className="text-muted-foreground mb-4">Inga sektioner än</p>
                      <Button onClick={addSection}>Lägg till första sektionen</Button>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="logic" className="flex-1 m-0">
              <ConditionalLogicEditor
                schema={currentForm.schema}
                onUpdate={updateSchema}
              />
            </TabsContent>
            
            <TabsContent value="settings" className="flex-1 m-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Formulärinställningar</h3>
                    <div className="space-y-4">
                      <div>
                        <Label>Formulär-ID</Label>
                        <p className="text-sm text-muted-foreground">{formId || 'Nytt formulär'}</p>
                      </div>
                      
                      <div>
                        <Label>Antal sektioner</Label>
                        <p className="text-sm text-muted-foreground">
                          {currentForm.schema.sections.length}
                        </p>
                      </div>
                      
                      <div>
                        <Label>Totalt antal frågor</Label>
                        <p className="text-sm text-muted-foreground">
                          {currentForm.schema.sections.reduce((total, section) => 
                            total + section.questions.length, 0
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {validationErrors.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Validering</h4>
                      <div className="space-y-2">
                        {validationErrors.map((error, index) => (
                          <div 
                            key={index}
                            className={`p-3 rounded-lg border ${
                              error.type === 'error' 
                                ? 'border-destructive bg-destructive/10' 
                                : 'border-yellow-500 bg-yellow-50'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                                error.type === 'error' ? 'text-destructive' : 'text-yellow-600'
                              }`} />
                              <div>
                                <p className="text-sm font-medium">{error.message}</p>
                                {error.location && (
                                  <p className="text-xs text-muted-foreground">{error.location}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview panel */}
        <div className="w-1/2">
          <div className="h-full flex flex-col">
            <div className="border-b p-4 bg-background">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Förhandsvisning</h3>
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <FormPreview schema={currentForm.schema} />
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};