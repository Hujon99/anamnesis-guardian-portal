/**
 * Section Conditional Logic Component
 * Provides interface for setting up conditional logic for entire sections.
 * Supports both simple (answer-based) and advanced conditions:
 * - Specific answer on a question
 * - Any answer with specific value in a section
 * - Section total score threshold
 */

import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Eye, Layers, Plus, Trash2, Calculator, ListChecks, Target } from 'lucide-react';
import { FormTemplate, FormSection, AdvancedCondition } from '@/types/anamnesis';
import { SearchableQuestionPicker } from './SearchableQuestionPicker';

interface SectionConditionalLogicProps {
  section: FormSection;
  sectionIndex: number;
  schema: FormTemplate;
  onUpdate: (section: FormSection) => void;
}

export const SectionConditionalLogic: React.FC<SectionConditionalLogicProps> = ({
  section,
  sectionIndex,
  schema,
  onUpdate
}) => {
  const isEnabled = !!section.show_if;
  const [activeTab, setActiveTab] = useState<'simple' | 'advanced'>(
    section.show_if?.conditions && section.show_if.conditions.length > 0 ? 'advanced' : 'simple'
  );

  // Get all questions from previous sections that can be used as dependencies
  const availableDependencies = React.useMemo(() => {
    const deps: Array<{ id: string; label: string; type: string; options?: Array<string | { value: string; triggers_followups: boolean; }>; sectionTitle: string }> = [];
    
    for (let sIdx = 0; sIdx < sectionIndex; sIdx++) {
      const prevSection = schema.sections[sIdx];
      if (!prevSection) continue;
      
      prevSection.questions.forEach(q => {
        if (q) {
          deps.push({
            id: q.id,
            label: q.label,
            type: q.type,
            options: q.options,
            sectionTitle: prevSection.section_title
          });
        }
      });
    }
    
    return deps;
  }, [schema, sectionIndex]);

  // Get previous sections with their indices for advanced conditions
  const previousSections = React.useMemo(() => {
    return schema.sections
      .slice(0, sectionIndex)
      .map((s, idx) => ({ 
        index: idx, 
        title: s.section_title,
        hasScoringQuestions: s.questions.some(q => q.scoring?.enabled)
      }));
  }, [schema.sections, sectionIndex]);

  const selectedDependency = availableDependencies.find(dep => dep.id === section.show_if?.question);

  const handleToggleConditional = (enabled: boolean) => {
    if (!enabled) {
      // Remove conditional logic
      const { show_if, ...sectionWithoutCondition } = section;
      onUpdate(sectionWithoutCondition);
    } else {
      // Add empty conditional logic based on active tab
      if (activeTab === 'advanced') {
        onUpdate({
          ...section,
          show_if: {
            conditions: [],
            logic: 'or'
          }
        });
      } else {
        onUpdate({
          ...section,
          show_if: {
            question: '',
            equals: ''
          }
        });
      }
    }
  };

  const handleTabChange = (tab: 'simple' | 'advanced') => {
    setActiveTab(tab);
    if (isEnabled) {
      if (tab === 'advanced') {
        onUpdate({
          ...section,
          show_if: {
            conditions: [],
            logic: 'or'
          }
        });
      } else {
        onUpdate({
          ...section,
          show_if: {
            question: '',
            equals: ''
          }
        });
      }
    }
  };

  const handleDependencyChange = (dependencyId: string) => {
    if (!section.show_if) return;
    
    onUpdate({
      ...section,
      show_if: {
        ...section.show_if,
        question: dependencyId,
        equals: '' // Reset value when dependency changes
      }
    });
  };

  const handleValueChange = (value: string) => {
    if (!section.show_if) return;
    
    const currentValues = Array.isArray(section.show_if.equals) 
      ? section.show_if.equals 
      : [section.show_if.equals].filter(Boolean);
    
    let newValues: string[];
    if (currentValues.includes(value)) {
      // Remove value if already selected
      newValues = currentValues.filter(v => v !== value);
    } else {
      // Add value if not selected
      newValues = [...currentValues, value];
    }
    
    onUpdate({
      ...section,
      show_if: {
        ...section.show_if,
        equals: newValues.length === 1 ? newValues[0] : newValues
      }
    });
  };

  // Advanced condition handlers
  const addCondition = (type: AdvancedCondition['type']) => {
    const newCondition: AdvancedCondition = { type };
    
    if (type === 'any_answer') {
      newCondition.section_index = previousSections.length > 0 ? previousSections[0].index : 0;
      newCondition.any_value = [];
    } else if (type === 'section_score') {
      newCondition.target_section_index = previousSections.length > 0 ? previousSections[0].index : 0;
      newCondition.operator = 'less_than';
      newCondition.threshold = 16;
    } else if (type === 'answer') {
      newCondition.question_id = '';
      newCondition.values = [];
    }
    
    const existingConditions = section.show_if?.conditions || [];
    onUpdate({
      ...section,
      show_if: {
        ...section.show_if,
        conditions: [...existingConditions, newCondition],
        logic: 'or'
      }
    });
  };

  const updateCondition = (index: number, updates: Partial<AdvancedCondition>) => {
    const conditions = [...(section.show_if?.conditions || [])];
    conditions[index] = { ...conditions[index], ...updates };
    
    onUpdate({
      ...section,
      show_if: {
        ...section.show_if,
        conditions,
        logic: section.show_if?.logic || 'or'
      }
    });
  };

  const removeCondition = (index: number) => {
    const conditions = (section.show_if?.conditions || []).filter((_, i) => i !== index);
    onUpdate({
      ...section,
      show_if: {
        ...section.show_if,
        conditions,
        logic: section.show_if?.logic || 'or'
      }
    });
  };

  const generatePreviewText = () => {
    if (!section.show_if) return '';
    
    // Advanced conditions preview
    if (section.show_if.conditions && section.show_if.conditions.length > 0) {
      const parts: string[] = [];
      
      section.show_if.conditions.forEach(cond => {
        if (cond.type === 'any_answer') {
          const sectionName = previousSections.find(s => s.index === cond.section_index)?.title || 'Okänd sektion';
          const values = Array.isArray(cond.any_value) ? cond.any_value : [cond.any_value];
          parts.push(`Du har svarat ${values.map(v => `"${v}"`).join(' eller ')} på någon av frågorna i "${sectionName}"`);
        } else if (cond.type === 'section_score') {
          const sectionName = previousSections.find(s => s.index === cond.target_section_index)?.title || 'Okänd sektion';
          const opText = cond.operator === 'less_than' ? 'mindre än' : cond.operator === 'greater_than' ? 'större än' : 'lika med';
          parts.push(`Totalpoängen i "${sectionName}" är ${opText} ${cond.threshold}`);
        } else if (cond.type === 'answer') {
          const question = availableDependencies.find(d => d.id === cond.question_id);
          const values = Array.isArray(cond.values) ? cond.values : [cond.values];
          if (question) {
            parts.push(`Du har svarat ${values.map(v => `"${v}"`).join(' eller ')} på "${question.label}"`);
          }
        }
      });
      
      const logic = section.show_if.logic === 'and' ? ' OCH ' : ' ELLER ';
      return `Sektionen visas om:\n• ${parts.join(`\n• `)}`;
    }
    
    // Simple condition preview
    if (!selectedDependency) return '';
    
    const dependencyLabel = selectedDependency.label;
    const values = Array.isArray(section.show_if.equals) 
      ? section.show_if.equals 
      : [section.show_if.equals].filter(Boolean);
    
    if (values.length === 0) return `Hela sektionen visas när "${dependencyLabel}" besvaras`;
    
    if (values.length === 1) {
      return `Hela sektionen visas när "${dependencyLabel}" ${
        section.show_if.contains ? 'innehåller' : 'är'
      } "${values[0]}"`;
    }
    
    return `Hela sektionen visas när "${dependencyLabel}" ${
      section.show_if.contains ? 'innehåller' : 'är'
    } något av: ${values.map(v => `"${v}"`).join(', ')}`;
  };

  if (availableDependencies.length === 0 && previousSections.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg border-l-4 border-l-accent">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="h-4 w-4" />
          <span className="font-medium">Sektionslogik</span>
        </div>
        <p>Inga föregående sektioner tillgängliga för villkorlig logik.</p>
        <p className="text-xs mt-1">Skapa sektioner ovanför för att aktivera villkorlig visning av hela sektioner.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-gradient-to-br from-accent/8 to-accent/3 rounded-xl border border-accent/20 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-lg">
            <Layers className="h-4 w-4 text-accent" />
          </div>
          <div className="space-y-0.5">
            <Label className="text-sm font-semibold text-foreground">Villkorlig sektion</Label>
            <p className="text-xs text-muted-foreground">Visa sektion baserat på tidigare svar</p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggleConditional}
            className="ml-auto"
          />
        </div>
      </div>

      {isEnabled && (
        <div className="space-y-5 mt-6">
          {/* Mode selector tabs */}
          <div className="flex gap-2 p-1 bg-muted/50 rounded-lg w-fit">
            <Button
              variant={activeTab === 'simple' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('simple')}
              className="text-xs"
            >
              <Target className="h-3.5 w-3.5 mr-1.5" />
              Enkelt villkor
            </Button>
            <Button
              variant={activeTab === 'advanced' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('advanced')}
              className="text-xs"
            >
              <Calculator className="h-3.5 w-3.5 mr-1.5" />
              Avancerade villkor
            </Button>
          </div>

          {activeTab === 'simple' ? (
            // Simple condition UI (existing)
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Beroende på fråga</Label>
                <SearchableQuestionPicker
                  questions={availableDependencies}
                  value={section.show_if?.question || ''}
                  onValueChange={handleDependencyChange}
                  placeholder="Sök fråga från tidigare sektioner..."
                  className="h-12"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Värden (välj ett eller flera)</Label>
                {selectedDependency?.options ? (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/30">
                      💡 Markera alla värden som ska visa sektionen
                    </div>
                    <div className="grid grid-cols-1 gap-2.5 max-h-40 overflow-y-auto p-1">
                      {selectedDependency.options.map((option) => {
                        const optionValue = typeof option === 'string' ? option : option.value;
                        const optionLabel = typeof option === 'string' ? option : option.value;
                        const currentValues = Array.isArray(section.show_if?.equals) 
                          ? section.show_if.equals 
                          : [section.show_if?.equals].filter(Boolean);
                        const isSelected = currentValues.includes(optionValue);
                        
                        return (
                          <div
                            key={optionValue}
                            className={`group p-3 border rounded-lg cursor-pointer transition-all duration-200 text-sm hover:shadow-sm ${
                              isSelected 
                                ? 'bg-accent/20 border-accent text-accent-foreground shadow-sm ring-1 ring-accent/30' 
                                : 'border-border hover:bg-muted/50 hover:border-border'
                            }`}
                            onClick={() => handleValueChange(optionValue)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 border-2 rounded transition-all duration-200 flex items-center justify-center ${
                                isSelected 
                                  ? 'bg-accent border-accent shadow-sm' 
                                  : 'border-border group-hover:border-accent/50'
                              }`}>
                                {isSelected && (
                                  <div className="w-2 h-2 bg-accent-foreground rounded-sm"></div>
                                )}
                              </div>
                              <span className="font-medium">{optionLabel}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <Input
                    value={Array.isArray(section.show_if?.equals) 
                      ? section.show_if.equals.join(', ') 
                      : section.show_if?.equals as string || ''}
                    onChange={(e) => {
                      const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
                      onUpdate({
                        ...section,
                        show_if: {
                          ...section.show_if!,
                          equals: values.length === 1 ? values[0] : values
                        }
                      });
                    }}
                    placeholder="Ange värden separerade med komma..."
                    className="text-sm bg-background border-border/50 hover:border-border transition-colors"
                  />
                )}
              </div>
            </div>
          ) : (
            // Advanced conditions UI
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/30">
                💡 Lägg till villkor nedan. Sektionen visas om <strong>NÅGOT</strong> av villkoren är uppfyllt (OR-logik).
              </div>

              {/* Existing conditions */}
              <div className="space-y-3">
                {(section.show_if?.conditions || []).map((condition, idx) => (
                  <div key={idx} className="p-4 border border-border rounded-lg bg-background/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {condition.type === 'any_answer' && <><ListChecks className="h-3 w-3 mr-1" /> Någon fråga har svar</>}
                        {condition.type === 'section_score' && <><Calculator className="h-3 w-3 mr-1" /> Sektionspoäng</>}
                        {condition.type === 'answer' && <><Target className="h-3 w-3 mr-1" /> Specifik fråga</>}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondition(idx)}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {condition.type === 'any_answer' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Sektion att kontrollera</Label>
                          <Select
                            value={String(condition.section_index)}
                            onValueChange={(v) => updateCondition(idx, { section_index: parseInt(v) })}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Välj sektion" />
                            </SelectTrigger>
                            <SelectContent>
                              {previousSections.map(s => (
                                <SelectItem key={s.index} value={String(s.index)}>
                                  {s.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Om någon fråga har värdet</Label>
                          <Input
                            value={Array.isArray(condition.any_value) ? condition.any_value.join(', ') : condition.any_value || ''}
                            onChange={(e) => {
                              const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
                              updateCondition(idx, { any_value: values });
                            }}
                            placeholder="t.ex. 1, 2 (separera med komma)"
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {condition.type === 'section_score' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Sektion</Label>
                          <Select
                            value={String(condition.target_section_index)}
                            onValueChange={(v) => updateCondition(idx, { target_section_index: parseInt(v) })}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Välj sektion" />
                            </SelectTrigger>
                            <SelectContent>
                              {previousSections.filter(s => s.hasScoringQuestions).map(s => (
                                <SelectItem key={s.index} value={String(s.index)}>
                                  {s.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Jämförelse</Label>
                          <Select
                            value={condition.operator || 'less_than'}
                            onValueChange={(v) => updateCondition(idx, { operator: v as 'less_than' | 'greater_than' | 'equals' })}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="less_than">Mindre än</SelectItem>
                              <SelectItem value="greater_than">Större än</SelectItem>
                              <SelectItem value="equals">Lika med</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Tröskelvärde</Label>
                          <Input
                            type="number"
                            value={condition.threshold ?? 16}
                            onChange={(e) => updateCondition(idx, { threshold: parseInt(e.target.value) || 0 })}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {condition.type === 'answer' && (() => {
                      const selectedQuestion = availableDependencies.find(d => d.id === condition.question_id);
                      const currentValues = Array.isArray(condition.values) 
                        ? condition.values 
                        : [condition.values].filter(Boolean) as string[];
                      
                      const handleAnswerValueToggle = (optionValue: string) => {
                        const newValues = currentValues.includes(optionValue)
                          ? currentValues.filter(v => v !== optionValue)
                          : [...currentValues, optionValue];
                        updateCondition(idx, { values: newValues });
                      };
                      
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Fråga</Label>
                            <SearchableQuestionPicker
                              questions={availableDependencies}
                              value={condition.question_id || ''}
                              onValueChange={(v) => updateCondition(idx, { question_id: v, values: [] })}
                              placeholder="Välj fråga..."
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Värde(n)</Label>
                            {selectedQuestion?.options ? (
                              <div className="grid grid-cols-1 gap-1.5 max-h-32 overflow-y-auto p-1">
                                {selectedQuestion.options.map((option) => {
                                  const optionValue = typeof option === 'string' ? option : option.value;
                                  const optionLabel = typeof option === 'string' ? option : option.value;
                                  const isSelected = currentValues.includes(optionValue);
                                  
                                  return (
                                    <div
                                      key={optionValue}
                                      className={`group p-2 border rounded cursor-pointer transition-all duration-200 text-xs hover:shadow-sm ${
                                        isSelected 
                                          ? 'bg-accent/20 border-accent text-accent-foreground shadow-sm ring-1 ring-accent/30' 
                                          : 'border-border hover:bg-muted/50 hover:border-border'
                                      }`}
                                      onClick={() => handleAnswerValueToggle(optionValue)}
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className={`w-3.5 h-3.5 border-2 rounded transition-all duration-200 flex items-center justify-center ${
                                          isSelected 
                                            ? 'bg-accent border-accent shadow-sm' 
                                            : 'border-border group-hover:border-accent/50'
                                        }`}>
                                          {isSelected && (
                                            <div className="w-1.5 h-1.5 bg-accent-foreground rounded-sm"></div>
                                          )}
                                        </div>
                                        <span className="font-medium">{optionLabel}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <Input
                                value={currentValues.join(', ')}
                                onChange={(e) => {
                                  const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
                                  updateCondition(idx, { values });
                                }}
                                placeholder="t.ex. 1, 2 (separera med komma)"
                                className="h-9 text-sm"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>

              {/* Add condition buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addCondition('any_answer')}
                  className="text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Någon fråga har svar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addCondition('section_score')}
                  className="text-xs"
                  disabled={!previousSections.some(s => s.hasScoringQuestions)}
                  title={!previousSections.some(s => s.hasScoringQuestions) ? 'Inga sektioner med poängfrågor' : ''}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Sektionspoäng
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addCondition('answer')}
                  className="text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Specifik fråga
                </Button>
              </div>
            </div>
          )}

          {/* Preview */}
          {((activeTab === 'simple' && section.show_if?.question) || 
            (activeTab === 'advanced' && (section.show_if?.conditions?.length || 0) > 0)) && (
            <div className="animate-fade-in p-4 bg-gradient-to-br from-accent/15 to-accent/5 rounded-xl border border-accent/30 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-1.5 bg-accent/20 rounded-lg mt-0.5">
                    <Eye className="h-3.5 w-3.5 text-accent" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-accent">Förhandsvisning:</span>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                      {generatePreviewText()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleConditional(false)}
                  className="h-5 w-5 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
