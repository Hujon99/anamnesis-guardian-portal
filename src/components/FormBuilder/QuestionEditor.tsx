/**
 * Question Editor Component
 * Provides comprehensive editing interface for individual form questions
 * including type selection, options management, and conditional logic setup.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';

import {
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Trash2,
  Plus,
  X,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Settings
} from 'lucide-react';

import { FormQuestion, FormTemplate } from '@/types/anamnesis';
import { generateUniqueQuestionId, validateQuestionId, suggestAlternativeIds, isIdUnique } from '@/utils/questionIdUtils';

interface QuestionEditorProps {
  question: FormQuestion;
  questionIndex: number;
  sectionIndex: number;
  schema: FormTemplate;
  onUpdate: (question: FormQuestion) => void;
  onDelete: () => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  totalQuestions: number;
  isFromDatabase?: boolean; // Flag to indicate if question was loaded from database
}

const QUESTION_TYPES = [
  { value: 'text', label: 'Textfråga' },
  { value: 'textarea', label: 'Textområde' },
  { value: 'radio', label: 'Radioknappar' },
  { value: 'checkbox', label: 'Kryssrutor' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'date', label: 'Datum' },
  { value: 'number', label: 'Nummer' },
  { value: 'email', label: 'E-post' },
  { value: 'tel', label: 'Telefon' },
  { value: 'url', label: 'URL' }
];

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  questionIndex,
  sectionIndex,
  schema,
  onUpdate,
  onDelete,
  onMove,
  totalQuestions,
  isFromDatabase = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showIdSuggestions, setShowIdSuggestions] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };


  const updateField = (field: keyof FormQuestion, value: any) => {
    onUpdate({
      ...question,
      [field]: value
    });
  };

  const handleLabelChange = (newLabel: string) => {
    updateField('label', newLabel);
    
    // CRITICAL: Never auto-generate ID for questions loaded from database
    if (isFromDatabase) {
      console.log(`[QuestionEditor] Preserving database ID "${question.id}" for question from database`);
      return;
    }
    
    // For new questions: only auto-generate ID if current ID is empty, UUID, or temp ID
    const isCurrentIdUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(question.id);
    const isTemporaryId = /^(ny_|temp_|question_\d+|fraga_\d+)/.test(question.id);
    const shouldAutoGenerateId = !question.id || isCurrentIdUUID || isTemporaryId;
    
    if (shouldAutoGenerateId && newLabel.trim()) {
      const newId = generateUniqueQuestionId(newLabel, schema, question.id);
      if (newId !== question.id) {
        console.log(`[QuestionEditor] Auto-generating ID for new question: "${question.id}" -> "${newId}"`);
        updateField('id', newId);
      }
    } else {
      console.log(`[QuestionEditor] Preserving existing meaningful ID "${question.id}" for label "${newLabel}"`);
    }
  };

  const handleIdChange = (newId: string) => {
    updateField('id', newId);
    setShowIdSuggestions(false);
  };

  const generateIdFromLabel = () => {
    const newId = generateUniqueQuestionId(question.label, schema, question.id);
    updateField('id', newId);
    setShowIdSuggestions(false);
  };

  // Validation for current ID
  const idValidation = validateQuestionId(question.id);
  const isIdUniqueInForm = isIdUnique(question.id, schema, question.id);
  const idSuggestions = showIdSuggestions ? suggestAlternativeIds(question.label, schema, question.id) : [];

  const updateOption = (optionIndex: number, value: string) => {
    if (!question.options) return;
    
    const updatedOptions = [...question.options];
    updatedOptions[optionIndex] = value;
    updateField('options', updatedOptions);
  };

  const addOption = () => {
    const currentOptions = question.options || [];
    updateField('options', [...currentOptions, `Alternativ ${currentOptions.length + 1}`]);
  };

  const removeOption = (optionIndex: number) => {
    if (!question.options || question.options.length <= 1) return;
    
    const updatedOptions = question.options.filter((_, index) => index !== optionIndex);
    updateField('options', updatedOptions);
  };

  const moveOption = (fromIndex: number, toIndex: number) => {
    if (!question.options || fromIndex === toIndex) return;
    
    const updatedOptions = [...question.options];
    const [movedOption] = updatedOptions.splice(fromIndex, 1);
    updatedOptions.splice(toIndex, 0, movedOption);
    updateField('options', updatedOptions);
  };

  const changeQuestionType = (newType: string) => {
    const updatedQuestion = { ...question, type: newType as any };
    
    // Add default options for select/radio types
    if ((newType === 'radio' || newType === 'dropdown') && !updatedQuestion.options) {
      updatedQuestion.options = ['Alternativ 1', 'Alternativ 2'];
    }
    
    // Remove options for types that don't need them
    if (!['radio', 'dropdown', 'checkbox'].includes(newType)) {
      delete updatedQuestion.options;
    }
    
    onUpdate(updatedQuestion);
  };

  const requiresOptions = ['radio', 'dropdown', 'checkbox'].includes(question.type);

  return (
    <>
      <Card 
        ref={setNodeRef}
        style={style}
        className={`border-l-4 border-l-primary/20 ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>

            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing touch-none"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <Input
                value={question.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                className="font-medium border-none shadow-none p-0 h-auto text-base bg-transparent"
                placeholder="Frågetext..."
              />
            </div>

            <div className="flex items-center gap-1">
              <Select value={question.type} onValueChange={changeQuestionType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {questionIndex > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMove(questionIndex, questionIndex - 1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              )}

              {questionIndex < totalQuestions - 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMove(questionIndex, questionIndex + 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowAdvanced(!showAdvanced)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Avancerade inställningar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Ta bort fråga
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* Question ID */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`question-id-${questionIndex}`}>Fråge-ID</Label>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={generateIdFromLabel}
                        className="text-xs h-6 px-2"
                      >
                        Auto-generera
                      </Button>
                      {idSuggestions.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowIdSuggestions(!showIdSuggestions)}
                          className="text-xs h-6 px-2"
                        >
                          Förslag
                        </Button>
                      )}
                    </div>
                  </div>
                  <Input
                    id={`question-id-${questionIndex}`}
                    value={question.id}
                    onChange={(e) => handleIdChange(e.target.value)}
                    placeholder="unik_id"
                    className={
                      !idValidation.isValid || !isIdUniqueInForm
                        ? "border-destructive focus:ring-destructive"
                        : "border-border"
                    }
                  />
                  {(!idValidation.isValid || !isIdUniqueInForm) && (
                    <div className="text-sm text-destructive space-y-1">
                      {idValidation.errors.map((error, idx) => (
                        <div key={idx}>{error}</div>
                      ))}
                      {!isIdUniqueInForm && (
                        <div>Detta ID används redan av en annan fråga</div>
                      )}
                    </div>
                  )}
                  {showIdSuggestions && idSuggestions.length > 0 && (
                    <div className="border rounded p-2 bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-2">Föreslagna ID:n:</p>
                      <div className="flex flex-wrap gap-1">
                        {idSuggestions.map((suggestion, idx) => (
                          <Button
                            key={idx}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleIdChange(suggestion)}
                            className="text-xs h-6 px-2"
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Typ</Label>
                  <p className="text-sm text-muted-foreground py-2">
                    {QUESTION_TYPES.find(t => t.value === question.type)?.label}
                  </p>
                </div>
              </div>

              {/* Options for radio/dropdown/checkbox */}
              {requiresOptions && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Alternativ</Label>
                    <Button size="sm" onClick={addOption} className="gap-2">
                      <Plus className="h-3 w-3" />
                      Lägg till alternativ
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {question.options?.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center gap-2">
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveOption(optionIndex, optionIndex - 1)}
                            disabled={optionIndex === 0}
                            className="h-4 w-6 p-0"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveOption(optionIndex, optionIndex + 1)}
                            disabled={optionIndex === (question.options?.length || 1) - 1}
                            className="h-4 w-6 p-0"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move flex-shrink-0" />
                        <Input
                          value={typeof option === 'string' ? option : option.value || ''}
                          onChange={(e) => updateOption(optionIndex, e.target.value)}
                          placeholder={`Alternativ ${optionIndex + 1}`}
                          className="flex-1"
                        />
                        {question.options && question.options.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOption(optionIndex)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Advanced settings */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleContent className="space-y-4">
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Avancerade inställningar</h4>
                    
                    <div className="space-y-4">
                      {/* Required field */}
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Obligatorisk fråga</Label>
                          <p className="text-sm text-muted-foreground">
                            Användaren måste svara på denna fråga
                          </p>
                        </div>
                        <Switch
                          checked={question.required || false}
                          onCheckedChange={(checked) => updateField('required', checked)}
                        />
                      </div>

                      {/* Placeholder */}
                      {['text', 'textarea', 'email', 'tel', 'url', 'number'].includes(question.type) && (
                        <div className="space-y-2">
                          <Label>Placeholder-text</Label>
                          <Input
                            value={question.placeholder || ''}
                            onChange={(e) => updateField('placeholder', e.target.value)}
                            placeholder="Text som visas när fältet är tomt..."
                          />
                        </div>
                      )}

                      {/* Help text */}
                      <div className="space-y-2">
                        <Label>Hjälptext</Label>
                        <Textarea
                          value={question.help_text || ''}
                          onChange={(e) => updateField('help_text', e.target.value)}
                          placeholder="Ytterligare information om frågan..."
                          rows={2}
                        />
                      </div>

                      {/* Show in mode */}
                      <div className="space-y-2">
                        <Label>Visa i läge</Label>
                        <Select
                          value={question.show_in_mode || 'both'}
                          onValueChange={(value) => updateField('show_in_mode', value === 'both' ? undefined : value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="both">Alla lägen</SelectItem>
                            <SelectItem value="patient">Endast patient</SelectItem>
                            <SelectItem value="optician">Endast optiker</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort fråga</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort frågan "{question.label}"?
              Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ta bort fråga
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};