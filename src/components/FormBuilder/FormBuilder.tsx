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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Save, 
  Eye, 
  EyeOff,
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

// DndKit imports for section drag and drop
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { SectionEditor } from './SectionEditor';
import { SortableSectionEditor } from './SortableSectionEditor';
import { FormPreview } from './FormPreview';
import { ConditionalLogicEditor } from './ConditionalLogicEditor';

import { LivePreviewPanel } from './LivePreviewPanel';
import { NaturalLanguageLogicBuilder } from './NaturalLanguageLogicBuilder';
import { ContextualHelpSystem } from './ContextualHelpSystem';

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
      console.log('[FormBuilder] Initializing with form:', { 
        title: initialForm.title, 
        hasSchema: !!initialForm.schema 
      });
      
      if (initialForm.schema) {
        // Debug: Log question IDs from database
        initialForm.schema.sections.forEach((section, sIdx) => {
          section.questions.forEach((question, qIdx) => {
            console.log(`[FormBuilder] Section ${sIdx}, Question ${qIdx}: ID="${question.id}", Label="${question.label}"`);
          });
        });
      }
      
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
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // History management for undo/redo
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Drag and drop sensors for sections
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Debug: Watch for changes to currentForm.schema
  useEffect(() => {
    if (currentForm.schema?.sections) {
      console.log('[FormBuilder] Schema updated, checking question IDs:');
      currentForm.schema.sections.forEach((section, sIdx) => {
        section.questions.forEach((question, qIdx) => {
          console.log(`[FormBuilder] Section ${sIdx}, Question ${qIdx}: ID="${question.id}", Label="${question.label}"`);
        });
      });
    }
  }, [currentForm.schema]);

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
      
      // Show success toast
      toast.success("Formulär sparat", {
        description: "Alla ändringar har sparats framgångsrikt.",
        duration: 3000,
      });
    } catch (error) {
      console.error('Save error:', error);
      // Show error toast
      toast.error("Fel vid sparning", {
        description: "Kunde inte spara formuläret. Försök igen.",
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle close with unsaved changes check
  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      onClose?.();
    }
  };

  const confirmClose = () => {
    setShowUnsavedDialog(false);
    onClose?.();
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

  // Handle section drag end
  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('[FormBuilder] Drag end:', { activeId: active.id, overId: over?.id });

    if (active.id !== over?.id) {
      const activeIndex = parseInt(active.id.toString().replace('section-', ''));
      const overIndex = parseInt(over?.id.toString().replace('section-', '') || '0');
      
      console.log('[FormBuilder] Moving section:', { activeIndex, overIndex });
      
      if (activeIndex !== overIndex && !isNaN(activeIndex) && !isNaN(overIndex)) {
        const newSections = arrayMove(currentForm.schema.sections, activeIndex, overIndex);
        updateSchema({
          ...currentForm.schema,
          sections: newSections
        });
        addToHistory(`Flyttade sektion från position ${activeIndex + 1} till ${overIndex + 1}`);
        
        console.log('[FormBuilder] Section moved successfully');
      }
    }
  };

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
            
            {/* Preview toggle */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowPreview(!showPreview)}
              className="gap-2"
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreview ? 'Dölj förhandsgranskning' : 'Visa förhandsgranskning'}
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            {/* Save */}
            <Button onClick={handleSave} disabled={!canSave} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? 'Sparar...' : 'Spara'}
            </Button>
            
            {onClose && (
              <Button variant="outline" onClick={handleClose}>
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
      <div className="flex-1 flex min-h-0">
        {/* Editor panel */}
        <div className={showPreview ? "w-1/2 border-r" : "w-full"}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 m-4 mb-0 flex-shrink-0">
              <TabsTrigger value="sections">Sektioner</TabsTrigger>
              
              <TabsTrigger value="logic">Villkorlig logik</TabsTrigger>
              <TabsTrigger value="settings">Inställningar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sections" className="flex-1 m-0 min-h-0 flex flex-col data-[state=inactive]:hidden">
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Sektioner</h3>
                    <Button onClick={addSection} size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Lägg till sektion
                    </Button>
                  </div>
                  
                  {currentForm.schema.sections.length > 0 && (
                    <DndContext 
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleSectionDragEnd}
                      onDragStart={() => console.log('[FormBuilder] Drag started')}
                    >
                      <SortableContext 
                        items={currentForm.schema.sections.map((_, index) => `section-${index}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-4 relative">
                          {/* Drop zone indicator */}
                          <div className="absolute -left-2 top-0 bottom-0 w-1 bg-muted/30 rounded opacity-50" />
                          
                          {currentForm.schema.sections.map((section, index) => (
                            <SortableSectionEditor
                              key={`section-${index}`}
                              section={section}
                              sectionIndex={index}
                              schema={currentForm.schema}
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
                              isFromDatabase={!!initialForm?.id}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                  
                  {currentForm.schema.sections.length === 0 && (
                    <Card className="p-8 text-center">
                      <p className="text-muted-foreground mb-4">Inga sektioner än</p>
                      <Button onClick={addSection}>Lägg till första sektionen</Button>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
            
            
            <TabsContent value="logic" className="flex-1 m-0 min-h-0 data-[state=inactive]:hidden">
              <NaturalLanguageLogicBuilder
                schema={currentForm.schema}
                onUpdate={updateSchema}
                activeQuestion={activeTab === 'sections' ? undefined : undefined}
              />
            </TabsContent>
            
            <TabsContent value="settings" className="flex-1 m-0 min-h-0 data-[state=inactive]:hidden">
              <div className="h-full overflow-y-auto">
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
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview panel */}
        {showPreview && (
          <div className="w-1/2 border-l">
            <div className="h-full flex flex-col">
              <div className="border-b p-4 bg-background">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">Förhandsvisning</h3>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto">
                <FormPreview schema={currentForm.schema} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contextual Help System */}
      <ContextualHelpSystem 
        schema={currentForm.schema}
        currentTab={activeTab}
        onNavigate={(tab, sectionIndex, questionIndex) => {
          setActiveTab(tab);
          // Could add logic to navigate to specific section/question
        }}
      />

      {/* Unsaved changes confirmation dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Osparade ändringar</AlertDialogTitle>
            <AlertDialogDescription>
              Du har osparade ändringar i detta formulär. Om du stänger nu kommer dessa ändringar att gå förlorade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fortsätt redigera</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Stäng utan att spara
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};