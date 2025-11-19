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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  Plus,
  Lightbulb,
  Keyboard
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
  MouseSensor,
  TouchSensor,
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
import { LivePreviewPanel } from './LivePreviewPanel';
import { QuestionPresetManager } from './QuestionPresetManager';

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
  const [newSectionIndex, setNewSectionIndex] = useState<number | undefined>();
  const [newQuestionInfo, setNewQuestionInfo] = useState<{ sectionIndex: number; questionIndex: number } | undefined>();
  
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
        sections: [],
        question_presets: []
      }
    };
  });

  // Auto-initialize CISS presets and first section when examination type changes to CISS
  useEffect(() => {
    if (currentForm.examination_type === 'CISS-formulär') {
      let needsUpdate = false;
      const updates: Partial<FormTemplate> = {};

      // Auto-create presets if they don't exist
      if (!currentForm.schema.question_presets || currentForm.schema.question_presets.length === 0) {
        updates.question_presets = [
          {
            name: 'CISS 5-skalig frekvens',
            type: 'dropdown' as const,
            options: [
              'Aldrig (0)',
              'Sällan (1)',
              'Ibland (2)',
              'Ofta (3)',
              'Mycket ofta (4)'
            ],
            scoring: {
              enabled: true,
              min_value: 0,
              max_value: 4
            }
          },
          {
            name: 'CISS Ja/Nej',
            type: 'radio' as const,
            options: [
              'Nej (0)',
              'Ja (1)'
            ],
            scoring: {
              enabled: true,
              min_value: 0,
              max_value: 1
            }
          }
        ];
        needsUpdate = true;
      }

      // Auto-create first section if none exists
      if (currentForm.schema.sections.length === 0) {
        updates.sections = [
          {
            section_title: 'CISS Bedömning',
            questions: []
          }
        ];
        needsUpdate = true;
      }

      if (needsUpdate) {
        updateSchema({
          ...currentForm.schema,
          ...updates
        });
      }
    }
  }, [currentForm.examination_type]);

  const [activeTab, setActiveTab] = useState('sections');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lastExpandedSectionIndex, setLastExpandedSectionIndex] = useState<number | null>(null);
  
  // History management for undo/redo
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Drag and drop sensors for sections
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

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

  // Add new section
  const addSection = useCallback(() => {
    const newSection = {
      section_title: `Ny sektion ${currentForm.schema.sections.length + 1}`,
      questions: []
    };
    
    const newIndex = currentForm.schema.sections.length;
    setNewSectionIndex(newIndex);
    setLastExpandedSectionIndex(newIndex);
    
    updateSchema({
      ...currentForm.schema,
      sections: [...currentForm.schema.sections, newSection]
    });
    
    addToHistory('Lade till sektion');
    
    toast.success('Sektion tillagd', {
      description: `Ny sektion "${newSection.section_title}" har skapats`,
      duration: 2000,
    });
    
    // Clear the flag after a short delay
    setTimeout(() => setNewSectionIndex(undefined), 100);
  }, [currentForm.schema, updateSchema, addToHistory]);

  // Add new question to a specific section
  const addQuestionToSection = useCallback((sectionIndex: number) => {
    if (sectionIndex < 0 || sectionIndex >= currentForm.schema.sections.length) {
      toast.error('Kunde inte lägga till fråga', {
        description: 'Ingen giltig sektion hittades',
        duration: 3000,
      });
      return;
    }

    const section = currentForm.schema.sections[sectionIndex];
    const newQuestion = {
      id: `temp_${Date.now()}`,
      label: 'Ny fråga',
      type: 'text' as const
    };

    const updatedSections = [...currentForm.schema.sections];
    updatedSections[sectionIndex] = {
      ...section,
      questions: [...section.questions, newQuestion]
    };

    updateSchema({
      ...currentForm.schema,
      sections: updatedSections
    });

    addToHistory('Lade till fråga');
    setLastExpandedSectionIndex(sectionIndex);
    
    // Set new question info to auto-expand it
    setNewQuestionInfo({
      sectionIndex,
      questionIndex: updatedSections[sectionIndex].questions.length - 1
    });
    setTimeout(() => setNewQuestionInfo(undefined), 100);
    
    toast.success('Fråga tillagd', {
      description: `Fråga tillagd i "${section.section_title}"`,
      duration: 2000,
    });
  }, [currentForm.schema, updateSchema, addToHistory]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.isContentEditable;

      if ((e.metaKey || e.ctrlKey)) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            if (e.shiftKey && !isTyping) {
              // Ctrl+Shift+S: Add new section
              addSection();
            } else if (canSave) {
              // Ctrl+S: Save
              handleSave();
            }
            break;
          
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          
          case 'k':
            // Ctrl+K: Add question to last expanded section or first section
            if (!e.shiftKey && !isTyping) {
              e.preventDefault();
              if (currentForm.schema.sections.length === 0) {
                toast.error('Lägg till en sektion först', {
                  description: 'Du måste skapa en sektion innan du kan lägga till frågor',
                  duration: 3000,
                });
              } else {
                const targetSection = lastExpandedSectionIndex !== null 
                  ? lastExpandedSectionIndex 
                  : 0;
                addQuestionToSection(targetSection);
              }
            }
            break;
        }
      } else if (e.key === 'Escape' && !isTyping) {
        // Escape: Close dialogs (handled by dialog components automatically)
        // This is here for documentation purposes
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canSave, handleSave, undo, redo, addSection, addQuestionToSection, currentForm.schema.sections.length, lastExpandedSectionIndex]);

  // Handle section drag end
  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const activeIndex = parseInt(active.id.toString().replace('section-', ''));
      const overIndex = parseInt(over?.id.toString().replace('section-', '') || '0');
      
      if (activeIndex !== overIndex && !isNaN(activeIndex) && !isNaN(overIndex)) {
        const newSections = arrayMove(currentForm.schema.sections, activeIndex, overIndex);
        updateSchema({
          ...currentForm.schema,
          sections: newSections
        });
        addToHistory(`Flyttade sektion från position ${activeIndex + 1} till ${overIndex + 1}`);
      }
    }
  };

  return (
    <div className="h-screen flex flex-col bg-surface-light">
      {/* Header */}
      <div className="border-b bg-background p-4">
        {/* Validation Error Alert */}
        {hasErrors(validationErrors) && !canSave && (
          <div className="mb-4 p-4 rounded-lg border border-destructive bg-destructive/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-destructive mb-2">
                  Formuläret kan inte sparas
                </h4>
                <ul className="space-y-1 text-sm">
                  {validationErrors.filter(e => e.type === 'error').map((error, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-destructive">•</span>
                      <span>{error.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={undo} 
                    disabled={historyIndex <= 0}
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ångra (Ctrl+Z)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={redo} 
                    disabled={historyIndex >= history.length - 1}
                  >
                    <Redo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Gör om (Ctrl+Shift+Z)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleSave} disabled={!canSave} className="gap-2">
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Sparar...' : 'Spara'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Spara formulär (Ctrl+S)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {onClose && (
              <Button variant="outline" onClick={handleClose}>
                Stäng
              </Button>
            )}
          </div>
        </div>

        {/* Keyboard shortcuts help banner */}
        <div className="mb-4 p-3 rounded-lg bg-accent/10 border border-accent/30">
          <div className="flex items-start gap-3">
            <Keyboard className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm mb-1">Tangentbordsgenvägar</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <div><kbd className="px-1.5 py-0.5 rounded bg-background border text-foreground">Ctrl+S</kbd> Spara</div>
                <div><kbd className="px-1.5 py-0.5 rounded bg-background border text-foreground">Ctrl+Shift+S</kbd> Ny sektion</div>
                <div><kbd className="px-1.5 py-0.5 rounded bg-background border text-foreground">Ctrl+K</kbd> Ny fråga</div>
                <div><kbd className="px-1.5 py-0.5 rounded bg-background border text-foreground">Esc</kbd> Stäng dialog</div>
              </div>
            </div>
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
          
          <div className="space-y-3">
            <Label>Undersökningstyp</Label>
            <RadioGroup
              value={currentForm.examination_type}
              onValueChange={(value) => updateFormField('examination_type', value)}
              className="space-y-2"
            >
              {EXAMINATION_TYPE_OPTIONS.map((option) => (
                <div key={option.type} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.label} id={option.type} />
                  <Label htmlFor={option.type} className="cursor-pointer font-normal">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Editor panel */}
        <div className={showPreview ? "w-1/2 border-r" : "w-full"}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 m-4 mb-0 flex-shrink-0">
              <TabsTrigger value="sections">Sektioner</TabsTrigger>
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
                                
                                // Track if a new question was added
                                if (updatedSection.questions.length > section.questions.length) {
                                  setNewQuestionInfo({
                                    sectionIndex: index,
                                    questionIndex: updatedSection.questions.length - 1
                                  });
                                  // Clear the flag after a short delay
                                  setTimeout(() => setNewQuestionInfo(undefined), 100);
                                }
                                
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
                              isNewlyAdded={index === newSectionIndex}
                              newQuestionIndex={newQuestionInfo?.sectionIndex === index ? newQuestionInfo.questionIndex : undefined}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                  
                  {currentForm.schema.sections.length === 0 && (
                    <Card className="p-12 text-center border-2 border-dashed border-primary/30 bg-primary/5 animate-fade-in">
                      <Lightbulb className="h-12 w-12 text-primary mx-auto mb-4 opacity-70" />
                      <h3 className="text-xl font-semibold mb-2">Välkommen till formulärbyggaren! 🎉</h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Börja med att skapa din första sektion. Sektioner hjälper dig att organisera relaterade frågor i logiska grupper.
                      </p>
                      <Button onClick={addSection} size="lg" className="gap-2">
                        <Plus className="h-5 w-5" />
                        Skapa första sektionen
                      </Button>
                      <div className="mt-6 pt-6 border-t">
                        <p className="text-sm text-muted-foreground">
                          💡 <strong>Tips:</strong> Du kan dra och släppa för att ändra ordning på sektioner och frågor
                        </p>
                      </div>
                    </Card>
                  )}
                  
                  {currentForm.schema.sections.length > 0 && currentForm.schema.sections.every(s => s.questions.length === 0) && (
                    <div className="mt-4 p-4 bg-accent/5 border border-accent/20 rounded-lg animate-fade-in">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">Nästa steg: Lägg till frågor</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Expandera en sektion och klicka på "Lägg till fråga" för att börja bygga ditt formulär
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentForm.schema.sections.length > 0 && (
                    <div className="flex justify-center pt-6 pb-4">
                      <Button onClick={addSection} variant="outline" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Lägg till sektion
                      </Button>
                    </div>
                  )}
                </div>
              </div>
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

                  <Separator />

                  {/* Scoring Configuration */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Poängsättning</h3>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="scoring-enabled"
                          checked={currentForm.schema.scoring_config?.enabled || false}
                          onCheckedChange={(checked) => {
                            updateSchema({
                              ...currentForm.schema,
                              scoring_config: {
                                ...currentForm.schema.scoring_config,
                                enabled: checked as boolean,
                                total_threshold: currentForm.schema.scoring_config?.total_threshold || 0,
                                show_score_to_patient: currentForm.schema.scoring_config?.show_score_to_patient || false
                              }
                            });
                            addToHistory('Ändrade poängsättningsinställningar');
                          }}
                        />
                        <Label htmlFor="scoring-enabled" className="cursor-pointer">
                          Aktivera poängsättning
                        </Label>
                      </div>

                      {currentForm.schema.scoring_config?.enabled && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="total-threshold">Tröskel för total poäng</Label>
                            <Input
                              id="total-threshold"
                              type="number"
                              min="0"
                              value={currentForm.schema.scoring_config.total_threshold || 0}
                              onChange={(e) => {
                                updateSchema({
                                  ...currentForm.schema,
                                  scoring_config: {
                                    ...currentForm.schema.scoring_config!,
                                    total_threshold: parseInt(e.target.value) || 0
                                  }
                                });
                                addToHistory('Ändrade poängtröskeln');
                              }}
                            />
                            <p className="text-xs text-muted-foreground">
                              Varning visas när total poäng överstiger detta värde
                            </p>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="show-score-patient"
                              checked={currentForm.schema.scoring_config.show_score_to_patient || false}
                              onCheckedChange={(checked) => {
                                updateSchema({
                                  ...currentForm.schema,
                                  scoring_config: {
                                    ...currentForm.schema.scoring_config!,
                                    show_score_to_patient: checked as boolean
                                  }
                                });
                                addToHistory('Ändrade visning av poäng till patient');
                              }}
                            />
                            <Label htmlFor="show-score-patient" className="cursor-pointer">
                              Visa poäng för patient
                            </Label>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="threshold-message">Tröskelmeddelande</Label>
                            <Textarea
                              id="threshold-message"
                              value={currentForm.schema.scoring_config.threshold_message || ''}
                              onChange={(e) => {
                                updateSchema({
                                  ...currentForm.schema,
                                  scoring_config: {
                                    ...currentForm.schema.scoring_config!,
                                    threshold_message: e.target.value
                                  }
                                });
                                addToHistory('Ändrade tröskelmeddelande');
                              }}
                              placeholder="Meddelande som visas när tröskeln överskrids..."
                              rows={3}
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="disable-ai-summary"
                              checked={currentForm.schema.scoring_config.disable_ai_summary || false}
                              onCheckedChange={(checked) => {
                                updateSchema({
                                  ...currentForm.schema,
                                  scoring_config: {
                                    ...currentForm.schema.scoring_config!,
                                    disable_ai_summary: checked as boolean
                                  }
                                });
                                addToHistory('Ändrade AI-sammanfattning');
                              }}
                            />
                            <Label htmlFor="disable-ai-summary" className="cursor-pointer">
                              Inaktivera AI-sammanfattning
                            </Label>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Kiosk Mode Configuration */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Kioskläge</h3>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="kiosk-enabled"
                          checked={currentForm.schema.kiosk_mode?.enabled || false}
                          onCheckedChange={(checked) => {
                            updateSchema({
                              ...currentForm.schema,
                              kiosk_mode: {
                                ...currentForm.schema.kiosk_mode,
                                enabled: checked as boolean
                              }
                            });
                            addToHistory('Ändrade kiosklägesinställningar');
                          }}
                        />
                        <Label htmlFor="kiosk-enabled" className="cursor-pointer">
                          Aktivera kioskläge
                        </Label>
                      </div>

                      {currentForm.schema.kiosk_mode?.enabled && (
                        <>
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="require-supervisor"
                              checked={currentForm.schema.kiosk_mode.require_supervisor_code || false}
                              onCheckedChange={(checked) => {
                                updateSchema({
                                  ...currentForm.schema,
                                  kiosk_mode: {
                                    ...currentForm.schema.kiosk_mode!,
                                    require_supervisor_code: checked as boolean
                                  }
                                });
                                addToHistory('Ändrade krav på handledarkod');
                              }}
                            />
                            <Label htmlFor="require-supervisor" className="cursor-pointer">
                              Kräv handledarkod
                            </Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="auto-submit"
                              checked={currentForm.schema.kiosk_mode.auto_submit || false}
                              onCheckedChange={(checked) => {
                                updateSchema({
                                  ...currentForm.schema,
                                  kiosk_mode: {
                                    ...currentForm.schema.kiosk_mode!,
                                    auto_submit: checked as boolean
                                  }
                                });
                                addToHistory('Ändrade auto-submit');
                              }}
                            />
                            <Label htmlFor="auto-submit" className="cursor-pointer">
                              Automatisk inskickning
                            </Label>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Formuläret skickas automatiskt och laddar om efter 5 sekunder
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <Separator />

                  {/* Question Presets - Only for CISS forms */}
                  {currentForm.examination_type === 'CISS-formulär' && (
                    <>
                      <div>
                        <QuestionPresetManager
                          presets={currentForm.schema.question_presets || []}
                          onUpdate={(presets) => {
                            updateSchema({
                              ...currentForm.schema,
                              question_presets: presets
                            });
                            addToHistory('Uppdaterade frågemallar');
                          }}
                        />
                      </div>
                      <Separator />
                    </>
                  )}

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