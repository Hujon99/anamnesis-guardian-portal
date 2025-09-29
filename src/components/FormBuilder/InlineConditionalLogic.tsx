/**
 * Inline Conditional Logic Component
 * Provides a simplified interface for setting up conditional logic directly within question editors.
 * This allows users to quickly set up show/hide conditions without navigating to separate tabs.
 */

import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Eye, EyeOff } from 'lucide-react';
import { FormTemplate, FormQuestion } from '@/types/anamnesis';

interface InlineConditionalLogicProps {
  question: FormQuestion;
  schema: FormTemplate;
  sectionIndex: number;
  questionIndex: number;
  onUpdate: (question: FormQuestion) => void;
}

export const InlineConditionalLogic: React.FC<InlineConditionalLogicProps> = ({
  question,
  schema,
  sectionIndex,
  questionIndex,
  onUpdate
}) => {
  const [isEnabled, setIsEnabled] = useState(!!question.show_if);
  const [showPreview, setShowPreview] = useState(false);

  // Get all questions that appear before this one (can be used as dependencies)
  const availableDependencies = React.useMemo(() => {
    const deps: Array<{ id: string; label: string; type: string; options?: Array<string | { value: string; triggers_followups: boolean; }> }> = [];
    
    for (let sIdx = 0; sIdx <= sectionIndex; sIdx++) {
      const section = schema.sections[sIdx];
      if (!section) continue;
      
      const questionLimit = sIdx === sectionIndex ? questionIndex : section.questions.length;
      
      for (let qIdx = 0; qIdx < questionLimit; qIdx++) {
        const q = section.questions[qIdx];
        if (q && q.id !== question.id) {
          deps.push({
            id: q.id,
            label: q.label,
            type: q.type,
            options: q.options
          });
        }
      }
    }
    
    return deps;
  }, [schema, sectionIndex, questionIndex, question.id]);

  const selectedDependency = availableDependencies.find(dep => dep.id === question.show_if?.question);

  const handleToggleConditional = (enabled: boolean) => {
    setIsEnabled(enabled);
    
    if (!enabled) {
      // Remove conditional logic
      const { show_if, ...questionWithoutCondition } = question;
      onUpdate(questionWithoutCondition);
    } else {
      // Add empty conditional logic
      onUpdate({
        ...question,
        show_if: {
          question: '',
          equals: ''
        }
      });
    }
  };

  const handleDependencyChange = (dependencyId: string) => {
    if (!question.show_if) return;
    
    onUpdate({
      ...question,
      show_if: {
        ...question.show_if,
        question: dependencyId,
        equals: '' // Reset value when dependency changes
      }
    });
  };

  const handleValueChange = (value: string) => {
    if (!question.show_if) return;
    
    onUpdate({
      ...question,
      show_if: {
        ...question.show_if,
        equals: value
      }
    });
  };

  const generatePreviewText = () => {
    if (!question.show_if || !selectedDependency) return '';
    
    const dependencyLabel = selectedDependency.label;
    const value = question.show_if.equals;
    
    if (!value) return `Visas när "${dependencyLabel}" besvaras`;
    
    return `Visas när "${dependencyLabel}" ${
      question.show_if.contains ? 'innehåller' : 'är'
    } "${value}"`;
  };

  if (availableDependencies.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
        <p>Inga föregående frågor tillgängliga för villkorlig logik.</p>
        <p className="text-xs mt-1">Lägg till frågor ovanför för att aktivera villkorlig visning.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 bg-surface-light/50 rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Villkorlig visning</Label>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggleConditional}
          />
        </div>
        
        {isEnabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-1"
          >
            {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            Förhandsvisa
          </Button>
        )}
      </div>

      {isEnabled && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Beroende på fråga</Label>
              <Select
                value={question.show_if?.question || ''}
                onValueChange={handleDependencyChange}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Välj fråga..." />
                </SelectTrigger>
                <SelectContent className="bg-background border-border/50 min-w-[400px] max-w-[600px]">
                  {availableDependencies.map((dep) => (
                    <SelectItem key={dep.id} value={dep.id}>
                      <div className="flex items-start gap-2 w-full py-1">
                        <span className="font-medium leading-tight">{dep.label}</span>
                        <Badge variant="secondary" className="text-xs px-2 py-0.5 flex-shrink-0">
                          {dep.id}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Värde</Label>
              {selectedDependency?.options ? (
                <Select
                  value={question.show_if?.equals as string || ''}
                  onValueChange={handleValueChange}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Välj värde..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedDependency.options.map((option) => {
                      const optionValue = typeof option === 'string' ? option : option.value;
                      const optionLabel = typeof option === 'string' ? option : option.value;
                      return (
                        <SelectItem key={optionValue} value={optionValue}>
                          {optionLabel}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={question.show_if?.equals as string || ''}
                  onChange={(e) => handleValueChange(e.target.value)}
                  placeholder="Ange värde..."
                  className="text-xs"
                />
              )}
            </div>
          </div>

          {showPreview && (
            <div className="animate-fade-in p-2 bg-accent/20 rounded border border-accent/30">
              <div className="flex items-center gap-2">
                <Eye className="h-3 w-3 text-accent" />
                <span className="text-xs font-medium text-accent">Förhandsvisning:</span>
                <span className="text-xs text-muted-foreground">
                  {generatePreviewText() || 'Ofullständig regel'}
                </span>
              </div>
            </div>
          )}

          {question.show_if?.question && question.show_if?.equals && (
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs">
                {generatePreviewText()}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleConditional(false)}
                className="h-5 w-5 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};