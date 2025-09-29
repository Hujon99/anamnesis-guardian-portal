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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight, Plus, MoreVertical, Trash2, Edit, GripVertical, Move } from 'lucide-react';
import { FormSection, FormQuestion, FormTemplate } from '@/types/anamnesis';
import { QuestionEditor } from './QuestionEditor';
import { generateUniqueQuestionId } from '@/utils/questionIdUtils';
import { SectionConditionalLogic } from './SectionConditionalLogic';
interface SectionEditorProps {
  section: FormSection;
  sectionIndex: number;
  schema: FormTemplate;
  onUpdate: (section: FormSection) => void;
  onDelete: () => void;
  isFromDatabase?: boolean; // Flag to indicate if section was loaded from database
}
export const SectionEditor: React.FC<SectionEditorProps> = ({
  section,
  sectionIndex,
  schema,
  onUpdate,
  onDelete,
  isFromDatabase = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(section.section_title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
  const addQuestion = (type: string = 'text') => {
    const questionTypeLabels: Record<string, string> = {
      text: 'textfråga',
      textarea: 'textområde',
      radio: 'radioknappar',
      checkbox: 'kryssrutor',
      dropdown: 'dropdown',
      date: 'datum',
      number: 'nummer',
      email: 'epost',
      tel: 'telefon',
      url: 'url'
    };
    const questionLabel = `Ny ${questionTypeLabels[type] || type}`;
    const generatedId = generateUniqueQuestionId(questionLabel, schema);
    const newQuestion: FormQuestion = {
      id: generatedId,
      label: questionLabel,
      type: type as any,
      options: type === 'radio' || type === 'dropdown' ? ['Alternativ 1', 'Alternativ 2'] : undefined
    };
    onUpdate({
      ...section,
      questions: [...section.questions, newQuestion]
    });
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
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
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
  return <>
      <Card>
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
              <div className="flex items-center gap-2 flex-1">
                <h3 className="font-semibold text-lg">{section.section_title}</h3>
                <span className="text-sm text-muted-foreground">
                  {section.questions.length} frågor
                </span>
              </div>
            )}

            <div className="flex items-center gap-1">

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => addQuestion('text')}>
                    Textfråga
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addQuestion('textarea')}>
                    Textområde
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addQuestion('radio')}>
                    Radioknappar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addQuestion('checkbox')}>
                    Kryssrutor
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addQuestion('dropdown')}>
                    Dropdown
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addQuestion('date')}>
                    Datum
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addQuestion('number')}>
                    Nummer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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
          <CollapsibleContent>
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
                    {section.questions.map((question, questionIndex) => <QuestionEditor key={question.id} question={question} questionIndex={questionIndex} sectionIndex={sectionIndex} schema={schema} onUpdate={updatedQuestion => updateQuestion(questionIndex, updatedQuestion)} onDelete={() => deleteQuestion(questionIndex)} onMove={(fromIndex, toIndex) => moveQuestion(fromIndex, toIndex)} totalQuestions={section.questions.length} isFromDatabase={isFromDatabase} />)}
                  </SortableContext>
                </DndContext>

                {section.questions.length === 0 && <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
                    <p className="text-muted-foreground mb-4">Inga frågor i denna sektion</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <Plus className="h-4 w-4" />
                          Lägg till första frågan
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => addQuestion('text')}>
                          Textfråga
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addQuestion('textarea')}>
                          Textområde
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addQuestion('radio')}>
                          Radioknappar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addQuestion('checkbox')}>
                          Kryssrutor
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addQuestion('dropdown')}>
                          Dropdown
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

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