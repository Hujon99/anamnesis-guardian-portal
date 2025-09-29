/**
 * Section Conditional Logic Component
 * Provides interface for setting up conditional logic for entire sections.
 * Allows sections to be shown/hidden based on answers from previous sections.
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Eye, Layers } from 'lucide-react';
import { FormTemplate, FormSection } from '@/types/anamnesis';

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

  const selectedDependency = availableDependencies.find(dep => dep.id === section.show_if?.question);

  const handleToggleConditional = (enabled: boolean) => {
    if (!enabled) {
      // Remove conditional logic
      const { show_if, ...sectionWithoutCondition } = section;
      onUpdate(sectionWithoutCondition);
    } else {
      // Add empty conditional logic
      onUpdate({
        ...section,
        show_if: {
          question: '',
          equals: ''
        }
      });
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

  const generatePreviewText = () => {
    if (!section.show_if || !selectedDependency) return '';
    
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

  if (availableDependencies.length === 0) {
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
    <div className="space-y-3 p-3 bg-accent/5 rounded-lg border border-accent/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-accent" />
          <Label className="text-sm font-medium">Villkorlig sektion</Label>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggleConditional}
          />
        </div>
      </div>

      {isEnabled && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Beroende på fråga</Label>
              <Select
                value={section.show_if?.question || ''}
                onValueChange={handleDependencyChange}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Välj fråga..." />
                </SelectTrigger>
                <SelectContent>
                  {availableDependencies.map((dep) => (
                    <SelectItem key={dep.id} value={dep.id}>
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-32">{dep.label}</span>
                          <Badge variant="outline" className="text-xs">
                            {dep.id}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          från "{dep.sectionTitle}"
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Värden (välj ett eller flera)</Label>
              {selectedDependency?.options ? (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    Markera alla värden som ska visa sektionen:
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
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
                          className={`p-2 border rounded cursor-pointer transition-colors text-xs ${
                            isSelected 
                              ? 'bg-accent border-accent text-accent-foreground' 
                              : 'border-border hover:bg-muted'
                          }`}
                          onClick={() => handleValueChange(optionValue)}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 border rounded-sm flex items-center justify-center ${
                              isSelected ? 'bg-accent border-accent' : 'border-border'
                            }`}>
                              {isSelected && (
                                <div className="w-2 h-2 bg-accent-foreground rounded-sm"></div>
                              )}
                            </div>
                            {optionLabel}
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
                  className="text-xs"
                />
              )}
            </div>
          </div>

          {section.show_if?.question && section.show_if?.equals && (
            <div className="animate-fade-in p-2 bg-accent/20 rounded border border-accent/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-3 w-3 text-accent" />
                  <span className="text-xs font-medium text-accent">Regel:</span>
                  <span className="text-xs text-muted-foreground">
                    {generatePreviewText()}
                  </span>
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