/**
 * Section Editor Component
 * Provides editing interface for form sections including
 * title editing, question management, and drag-and-drop reordering.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight, Plus, MoreVertical, Trash2, Edit, GripVertical, Move, Sparkles, Lightbulb } from 'lucide-react';
import { FormSection, FormQuestion, FormTemplate, QuestionPreset } from '@/types/anamnesis';
import { QuestionEditor } from './QuestionEditor';
import { generateUniqueQuestionId } from '@/utils/questionIdUtils';
import { SectionConditionalLogic } from './SectionConditionalLogic';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
interface SectionEditorProps {
  section: FormSection;
  sectionIndex: number;
  schema: FormTemplate;
  onUpdate: (section: FormSection) => void;
  onDelete: () => void;
  isFromDatabase?: boolean; // Flag to indicate if section was loaded from database
  isNewlyAdded?: boolean; // Flag to indicate if section was just added
  newQuestionIndex?: number; // Index of newly added question to auto-expand
}
export const SectionEditor: React.FC<SectionEditorProps> = ({
  section,
  sectionIndex,
  schema,
  onUpdate,
  onDelete,
  isFromDatabase = false,
  isNewlyAdded = false,
  newQuestionIndex
}) => {
  const [isExpanded, setIsExpanded] = useState(isNewlyAdded);
  const [lastQuestionType, setLastQuestionType] = useState<string>('text');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(section.section_title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPresetDialog, setShowPresetDialog] = useState(false);

  const hasPresets = schema.question_presets && schema.question_presets.length > 0;
  
  // Check if section is conditional and find parent question
  const isConditional = !!section.show_if;
  const parentQuestion = isConditional && section.show_if?.question
    ? schema.sections
        .flatMap(s => s.questions)
        .find(q => q.id === section.show_if?.question)
    : undefined;
  const updateTitle = () => {
    if (editTitle.trim() && editTitle !== section.section_title) {
      onUpdate({
        ...section,
        section_title: editTitle.trim()
      });
    }
    setIsEditing(false);
  };
  const cancelEdit = () => {
    setEditTitle(section.section_title);
    setIsEditing(false);
  };
  const addQuestion = (type?: string, preset?: QuestionPreset) => {
    // Use last question type if no type specified, or default to 'text'
    const questionType = type || lastQuestionType;
    setLastQuestionType(questionType);
    
    let newQuestion: FormQuestion;

    if (preset) {
      // Create question from preset
      const questionLabel = `Ny fråga (${preset.name})`;
      const generatedId = generateUniqueQuestionId(questionLabel, schema);
      
      newQuestion = {
        id: generatedId,
        label: questionLabel,
        type: preset.type,
        options: [...preset.options],
        scoring: preset.scoring ? { ...preset.scoring } : undefined
      };
    } else {
      // Regular question creation
      const questionTypeLabels: Record<string, string> = {
        text: 'textfält',
        textarea: 'textområde',
        radio: 'radioknappar',
        checkbox: 'kryssrutor',
        dropdown: 'dropdown'
      };
      const questionLabel = `Ny ${questionTypeLabels[questionType] || questionType}`;
      const generatedId = generateUniqueQuestionId(questionLabel, schema);
      
      newQuestion = {
        id: generatedId,
        label: questionLabel,
        type: questionType as any,
        options: questionType === 'radio' || questionType === 'dropdown' || questionType === 'checkbox' ? ['Alternativ 1', 'Alternativ 2'] : undefined
      };
    }
    
    onUpdate({
      ...section,
      questions: [...section.questions, newQuestion]
    });
    setShowPresetDialog(false);
  };
  const updateQuestion = (questionIndex: number, updatedQuestion: FormQuestion) => {
    const updatedQuestions = [...section.questions];
    updatedQuestions[questionIndex] = updatedQuestion;
    onUpdate({
      ...section,
      questions: updatedQuestions
    });
  };
  const deleteQuestion = (questionIndex: number) => {
    const updatedQuestions = section.questions.filter((_, index) => index !== questionIndex);
    onUpdate({
      ...section,
      questions: updatedQuestions
    });
  };
  const moveQuestion = (fromIndex: number, toIndex: number) => {
    const updatedQuestions = [...section.questions];
    const [moved] = updatedQuestions.splice(fromIndex, 1);
    updatedQuestions.splice(toIndex, 0, moved);
    onUpdate({
      ...section,
      questions: updatedQuestions
    });
  };
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
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );
  const handleDragEnd = (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    if (over && active.id !== over.id) {
      const oldIndex = section.questions.findIndex(q => q.id === active.id);
      const newIndex = section.questions.findIndex(q => q.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const updatedQuestions = arrayMove(section.questions, oldIndex, newIndex);
        onUpdate({
          ...section,
          questions: updatedQuestions
        });
      }
    }
  };
  // Visual styling based on conditional status
  const borderColorClass = isConditional 
    ? 'border-l-accent' 
    : 'border-l-primary';
  
  const glowClass = isConditional 
    ? 'shadow-accent/10'
    : '';

  return <>
      <Card className={`
        border-l-4 ${borderColorClass} 
        transition-all duration-300 ease-out
        ${glowClass}
        ${isExpanded ? 'shadow-sm' : 'hover:shadow-sm'}
      `}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>

            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />

            

            {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') updateTitle();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className="font-semibold"
                  autoFocus
                />
                <Button onClick={updateTitle} size="sm" variant="outline">
                  Spara
                </Button>
                <Button onClick={cancelEdit} size="sm" variant="ghost">
                  Avbryt
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                <h3 
                  className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors" 
                  onClick={() => setIsEditing(true)}
                >
                  {section.section_title}
                </h3>
                <span className="text-sm text-muted-foreground">
                  {section.questions.length} frågor
                </span>
                {isConditional && parentQuestion && (
                  <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                    Villkorlig sektion → {parentQuestion.label.substring(0, 30)}{parentQuestion.label.length > 30 ? '...' : ''}
                  </Badge>
                )}
              </div>
            )}

            <div className="flex items-center gap-1">
              {hasPresets && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPresetDialog(true);
                  }}
                  className="gap-2 text-accent"
                  type="button"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              )}

              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  addQuestion('text');
                }}
                type="button"
                title="Lägg till fråga"
              >
                <Plus className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Redigera titel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Ta bort sektion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="transition-all duration-300 ease-out data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
            <CardContent className="pt-0">
              <div className="space-y-4">
                <SectionConditionalLogic
                  section={section}
                  sectionIndex={sectionIndex}
                  schema={schema}
                  onUpdate={onUpdate}
                />
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={section.questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                    {section.questions.map((question, questionIndex) => <QuestionEditor key={question.id} question={question} questionIndex={questionIndex} sectionIndex={sectionIndex} schema={schema} onUpdate={updatedQuestion => updateQuestion(questionIndex, updatedQuestion)} onDelete={() => deleteQuestion(questionIndex)} onMove={(fromIndex, toIndex) => moveQuestion(fromIndex, toIndex)} totalQuestions={section.questions.length} isFromDatabase={isFromDatabase} isNewlyAdded={questionIndex === newQuestionIndex} />)}
                  </SortableContext>
                </DndContext>

                {section.questions.length > 0 && (
                  <div className="flex justify-center pt-4 border-t border-dashed border-border/50 mt-4">
                    <div className="flex gap-2">
                      {hasPresets && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowPresetDialog(true);
                          }}
                          type="button"
                        >
                          <Sparkles className="h-4 w-4 text-accent" />
                          Använd mall
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          addQuestion('text');
                        }}
                        type="button"
                      >
                        <Plus className="h-4 w-4" />
                        Lägg till fråga
                      </Button>
                    </div>
                  </div>
                )}

                {section.questions.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg bg-muted/20 animate-fade-in">
                    <Lightbulb className="h-8 w-8 text-primary mx-auto mb-3 opacity-50" />
                    <p className="font-medium mb-1">Börja med att lägga till en fråga här 👇</p>
                    <p className="text-sm text-muted-foreground mb-4">Bygg ditt formulär genom att lägga till olika typer av frågor</p>
                    <div className="flex gap-2 justify-center">
                      {hasPresets && (
                        <Button 
                          variant="outline" 
                          className="gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowPresetDialog(true);
                          }}
                          type="button"
                        >
                          <Sparkles className="h-4 w-4 text-accent" />
                          Använd mall
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        className="gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          addQuestion('text');
                        }}
                        type="button"
                      >
                        <Plus className="h-4 w-4" />
                        Lägg till första frågan
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Preset Selection Dialog */}
      <Dialog open={showPresetDialog} onOpenChange={setShowPresetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Välj frågemall</DialogTitle>
            <DialogDescription>
              Välj en mall att använda för den nya frågan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {schema.question_presets?.map((preset, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => addQuestion(undefined, preset)}
              >
                <Sparkles className="h-5 w-5 text-accent flex-shrink-0" />
                <div className="flex-1 text-left">
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {preset.options.length} alternativ • 
                    {preset.scoring?.enabled && ` Poäng ${preset.scoring.min_value}-${preset.scoring.max_value}`}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>


      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort sektion</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort sektionen "{section.section_title}"? 
              Detta kommer också ta bort alla {section.questions.length} frågor i sektionen.
              Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ta bort sektion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
};