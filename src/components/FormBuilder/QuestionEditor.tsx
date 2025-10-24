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
import ReactMarkdown from 'react-markdown';
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
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
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
import { Badge } from '@/components/ui/badge';

import { FormQuestion, FormTemplate } from '@/types/anamnesis';
import { generateUniqueQuestionId, validateQuestionId, suggestAlternativeIds, isIdUnique } from '@/utils/questionIdUtils';
import { InlineConditionalLogic } from './InlineConditionalLogic';

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
  isNewlyAdded?: boolean; // Flag to indicate if question was just added
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
  isFromDatabase = false,
  isNewlyAdded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(isNewlyAdded);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showIdSuggestions, setShowIdSuggestions] = useState(false);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

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

  const [newOptionValue, setNewOptionValue] = useState('');

  const addOption = (value?: string) => {
    const currentOptions = question.options || [];
    const optionText = value || `Alternativ ${currentOptions.length + 1}`;
    updateField('options', [...currentOptions, optionText]);
    setNewOptionValue('');
  };

  const handleNewOptionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newOptionValue.trim()) {
      e.preventDefault();
      addOption(newOptionValue.trim());
    }
  };

  const removeOption = (optionIndex: number) => {
    if (!question.options || question.options.length <= 1) return;
    
    const updatedOptions = question.options.filter((_, index) => index !== optionIndex);
    updateField('options', updatedOptions);
  };

  const moveOption = (fromIndex: number, toIndex: number) => {
    if (!question.options || fromIndex === toIndex) return;
    
    const updatedOptions = arrayMove(question.options, fromIndex, toIndex);
    updateField('options', updatedOptions);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const activeIndex = question.options?.findIndex((_, index) => `option-${index}` === active.id) ?? -1;
      const overIndex = question.options?.findIndex((_, index) => `option-${index}` === over?.id) ?? -1;
      
      if (activeIndex !== -1 && overIndex !== -1) {
        moveOption(activeIndex, overIndex);
      }
    }
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
              {/* Mode and scoring indicator badges */}
              <div className="flex gap-1 mt-1">
                {question.show_in_mode && question.show_in_mode !== 'all' && (
                  <Badge variant="outline" className="text-xs">
                    {question.show_in_mode === 'patient' ? '👤 Patient' : '🔧 Optiker'}
                  </Badge>
                )}
                {question.scoring?.enabled && (
                  <Badge variant="outline" className="text-xs bg-primary/5 border-primary/30">
                    📊 Poäng ({question.scoring.max_value})
                  </Badge>
                )}
              </div>
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
                  <Label>Alternativ</Label>
                  
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={question.options?.map((_, index) => `option-${index}`) || []}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {question.options?.map((option, optionIndex) => (
                          <SortableOption
                            key={`option-${optionIndex}`}
                            option={option}
                            optionIndex={optionIndex}
                            totalOptions={question.options?.length || 0}
                            onUpdate={(value) => updateOption(optionIndex, value)}
                            onRemove={() => removeOption(optionIndex)}
                          />
                        ))}
                        
                        {/* Google Forms style: empty input field for adding new option */}
                        <div className="flex items-center gap-2 pl-6">
                          <div className="w-4 h-4 flex items-center justify-center">
                            {question.type === 'radio' && (
                              <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/30" />
                            )}
                            {question.type === 'checkbox' && (
                              <div className="w-3 h-3 border-2 border-muted-foreground/30 rounded-sm" />
                            )}
                            {question.type === 'dropdown' && (
                              <span className="text-muted-foreground/30 text-xs">{(question.options?.length || 0) + 1}</span>
                            )}
                          </div>
                          <Input
                            value={newOptionValue}
                            onChange={(e) => setNewOptionValue(e.target.value)}
                            onKeyDown={handleNewOptionKeyDown}
                            placeholder="Lägg till alternativ..."
                            className="flex-1 border-none border-b border-border rounded-none px-2 shadow-none focus-visible:ring-0 focus-visible:border-primary"
                          />
                        </div>
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}

              {/* Inline Conditional Logic */}
              <InlineConditionalLogic
                question={question}
                schema={schema}
                sectionIndex={sectionIndex}
                questionIndex={questionIndex}
                onUpdate={onUpdate}
              />

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

                      {/* Help text field with Markdown support for rich formatting */}
                      <div className="space-y-2">
                        <Label htmlFor={`helptext-${question.id}`} className="flex items-center gap-2">
                          Hjälptext (Markdown-stöd)
                          <span className="text-xs text-muted-foreground">
                            Stöder **fetstil**, listor, emojis
                          </span>
                        </Label>
                        <Textarea
                          id={`helptext-${question.id}`}
                          value={question.help_text || ''}
                          onChange={(e) => updateField('help_text', e.target.value)}
                          placeholder="**Varför är detta viktigt?**&#10;&#10;Detta hjälper oss att:&#10;- Förstå dina behov&#10;- Ge bättre service"
                          className="min-h-[100px] font-mono text-sm"
                        />
                        {question.help_text && (
                          <div className="mt-2 p-3 rounded-md bg-muted/50 border border-border">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Förhandsvisning:</p>
                            <div className="text-sm text-muted-foreground prose prose-sm max-w-none
                                       prose-headings:text-foreground prose-headings:font-semibold
                                       prose-strong:text-foreground prose-strong:font-semibold
                                       prose-ul:my-2 prose-li:my-0">
                              <ReactMarkdown>
                                {question.help_text}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Show in mode - prominent position with help text */}
                      <div className="space-y-2 p-4 bg-accent/5 rounded-lg border border-accent/20">
                        <div>
                          <Label className="text-sm font-medium">Visa i läge</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Bestäm vem som ser denna fråga i formuläret
                          </p>
                        </div>
                        <Select
                          value={question.show_in_mode || 'all'}
                          onValueChange={(value) => updateField('show_in_mode', value === 'all' ? undefined : value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              <div className="flex items-center gap-2">
                                <span>👥</span>
                                <div>
                                  <div className="font-medium">Alla lägen</div>
                                  <div className="text-xs text-muted-foreground">Visas för både patient och optiker</div>
                                </div>
                              </div>
                            </SelectItem>
                            <SelectItem value="patient">
                              <div className="flex items-center gap-2">
                                <span>👤</span>
                                <div>
                                  <div className="font-medium">Endast patient</div>
                                  <div className="text-xs text-muted-foreground">Patienten fyller i själv hemma</div>
                                </div>
                              </div>
                            </SelectItem>
                            <SelectItem value="optician">
                              <div className="flex items-center gap-2">
                                <span>🔧</span>
                                <div>
                                  <div className="font-medium">Endast optiker</div>
                                  <div className="text-xs text-muted-foreground">Optikern fyller i under besöket</div>
                                </div>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Scoring Configuration */}
                      {['radio', 'dropdown', 'number'].includes(question.type) && (
                        <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-sm font-medium">Poängsättning & Flaggning</Label>
                              <p className="text-xs text-muted-foreground mt-1">
                                Aktivera för att räkna poäng och flagga höga värden (t.ex. CISS-formulär)
                              </p>
                            </div>
                            <Switch
                              checked={question.scoring?.enabled || false}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  updateField('scoring', {
                                    enabled: true,
                                    max_value: 4,
                                    flag_threshold: undefined,
                                    warning_message: undefined
                                  });
                                } else {
                                  updateField('scoring', undefined);
                                }
                              }}
                            />
                          </div>

                          {question.scoring?.enabled && (
                            <div className="space-y-4 pt-2">
                              <div className="space-y-2">
                                <Label htmlFor={`max-value-${question.id}`}>
                                  Max poäng för denna fråga
                                </Label>
                                <Input
                                  id={`max-value-${question.id}`}
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={question.scoring.max_value || 0}
                                  onChange={(e) => updateField('scoring', {
                                    ...question.scoring,
                                    max_value: parseInt(e.target.value) || 0
                                  })}
                                  placeholder="T.ex. 4"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Högsta möjliga poäng för denna fråga
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`flag-threshold-${question.id}`}>
                                  Flagga vid värde (valfritt)
                                </Label>
                                <Input
                                  id={`flag-threshold-${question.id}`}
                                  type="number"
                                  min="0"
                                  value={question.scoring.flag_threshold ?? ''}
                                  onChange={(e) => updateField('scoring', {
                                    ...question.scoring,
                                    flag_threshold: e.target.value ? parseInt(e.target.value) : undefined
                                  })}
                                  placeholder="T.ex. 2"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Markera frågan om svaret är ≥ detta värde
                                </p>
                              </div>

                              {question.scoring.flag_threshold !== undefined && (
                                <div className="space-y-2">
                                  <Label htmlFor={`warning-message-${question.id}`}>
                                    Varningsmeddelande
                                  </Label>
                                  <Textarea
                                    id={`warning-message-${question.id}`}
                                    value={question.scoring.warning_message || ''}
                                    onChange={(e) => updateField('scoring', {
                                      ...question.scoring,
                                      warning_message: e.target.value
                                    })}
                                    placeholder="T.ex. 'Högt värde - behöver uppföljning'"
                                    className="min-h-[60px]"
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Meddelande som visas när frågan flaggas
                                  </p>
                                </div>
                              )}

                              {question.type === 'radio' || question.type === 'dropdown' ? (
                                <div className="p-3 bg-muted/50 rounded-md border">
                                  <p className="text-xs font-medium mb-2">💡 Tips för alternativ:</p>
                                  <p className="text-xs text-muted-foreground">
                                    Lägg till poäng i alternativtexten inom parentes, t.ex:<br />
                                    "Aldrig (0)", "Sällan (1)", "Ibland (2)", "Ofta (3)", "Alltid (4)"
                                  </p>
                                </div>
                              ) : (
                                <div className="p-3 bg-muted/50 rounded-md border">
                                  <p className="text-xs font-medium mb-2">💡 Tips för nummer:</p>
                                  <p className="text-xs text-muted-foreground">
                                    Svaret används direkt som poäng (t.ex. 0-4)
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
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

// Sortable Option Component
interface SortableOptionProps {
  option: string | { value: string; triggers_followups: boolean };
  optionIndex: number;
  totalOptions: number;
  onUpdate: (value: string) => void;
  onRemove: () => void;
}

const SortableOption: React.FC<SortableOptionProps> = ({
  option,
  optionIndex,
  totalOptions,
  onUpdate,
  onRemove,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `option-${optionIndex}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 ${isDragging ? 'opacity-50' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
      <Input
        value={typeof option === 'string' ? option : option.value || ''}
        onChange={(e) => onUpdate(e.target.value)}
        placeholder={`Alternativ ${optionIndex + 1}`}
        className="flex-1"
      />
      {totalOptions > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-destructive hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};