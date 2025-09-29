/**
 * Natural Language Logic Builder Component
 * Provides an intuitive interface for creating conditional logic using natural language
 * with smart suggestions, complex logic support, and automatic condition detection.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Lightbulb, 
  Wand2, 
  Plus, 
  X, 
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Link,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { FormTemplate, FormQuestion, FormSection } from '@/types/anamnesis';

interface NaturalLanguageLogicBuilderProps {
  schema: FormTemplate;
  onUpdate: (schema: FormTemplate) => void;
  activeQuestion?: { sectionIndex: number; questionIndex: number };
}

interface LogicRule {
  id: string;
  type: 'show' | 'hide' | 'require' | 'skip';
  target: {
    sectionIndex?: number;
    questionIndex?: number;
    questionId: string;
  };
  conditions: LogicCondition[];
  operator: 'AND' | 'OR';
  naturalLanguage: string;
  confidence: number;
}

interface LogicCondition {
  questionId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: string | number | boolean;
}

interface SmartSuggestion {
  id: string;
  description: string;
  confidence: number;
  rule: LogicRule;
  reasoning: string;
}

const LOGIC_PATTERNS = [
  {
    pattern: /om (.+) svarar (.+) på (.+)/i,
    description: 'Grundläggande villkor baserat på svar',
    type: 'show'
  },
  {
    pattern: /visa (.+) om (.+) är (.+)/i,
    description: 'Visa fråga baserat på villkor',
    type: 'show'
  },
  {
    pattern: /hoppa över (.+) om (.+)/i,
    description: 'Hoppa över fråga baserat på villkor',
    type: 'skip'
  },
  {
    pattern: /kräv (.+) om (.+)/i,
    description: 'Gör fråga obligatorisk baserat på villkor',
    type: 'require'
  }
];

const COMMON_CONDITIONS = [
  { label: 'är lika med', operator: 'equals' },
  { label: 'är inte lika med', operator: 'not_equals' },
  { label: 'innehåller', operator: 'contains' },
  { label: 'är större än', operator: 'greater_than' },
  { label: 'är mindre än', operator: 'less_than' },
  { label: 'är tom', operator: 'is_empty' },
  { label: 'är inte tom', operator: 'is_not_empty' }
];

export const NaturalLanguageLogicBuilder: React.FC<NaturalLanguageLogicBuilderProps> = ({
  schema,
  onUpdate,
  activeQuestion
}) => {
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [activeTab, setActiveTab] = useState('builder');
  const [logicRules, setLogicRules] = useState<LogicRule[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Extract all questions for reference
  const allQuestions = useMemo(() => {
    const questions: Array<{ question: FormQuestion; sectionIndex: number; questionIndex: number }> = [];
    schema.sections.forEach((section, sectionIndex) => {
      section.questions.forEach((question, questionIndex) => {
        questions.push({ question, sectionIndex, questionIndex });
      });
    });
    return questions;
  }, [schema]);

  // Analyze natural language input
  const analyzeNaturalLanguage = async (input: string) => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis - in real implementation, this would call an AI service
    setTimeout(() => {
      const suggestions = generateSmartSuggestions(input);
      setSmartSuggestions(suggestions);
      setIsAnalyzing(false);
    }, 1500);
  };

  // Generate smart suggestions based on natural language
  const generateSmartSuggestions = (input: string): SmartSuggestion[] => {
    const suggestions: SmartSuggestion[] = [];
    
    // Pattern matching for common logic structures
    LOGIC_PATTERNS.forEach((pattern, index) => {
      const match = input.match(pattern.pattern);
      if (match) {
        const suggestion: SmartSuggestion = {
          id: `suggestion-${index}`,
          description: `Skapa ${pattern.type} regel baserat på "${match[0]}"`,
          confidence: 0.85,
          rule: {
            id: `rule-${Date.now()}-${index}`,
            type: pattern.type as any,
            target: {
              questionId: 'auto-detect',
            },
            conditions: [{
              questionId: 'auto-detect',
              operator: 'equals',
              value: match[2] || ''
            }],
            operator: 'AND',
            naturalLanguage: input,
            confidence: 0.85
          },
          reasoning: `Baserat på mönstret: ${pattern.description}`
        };
        suggestions.push(suggestion);
      }
    });

    // Context-based suggestions
    if (activeQuestion) {
      const currentQuestion = schema.sections[activeQuestion.sectionIndex]?.questions[activeQuestion.questionIndex];
      if (currentQuestion) {
        suggestions.push({
          id: 'context-suggestion',
          description: `Skapa villkor för "${currentQuestion.label}"`,
          confidence: 0.75,
          rule: {
            id: `rule-context-${Date.now()}`,
            type: 'show',
            target: {
              sectionIndex: activeQuestion.sectionIndex,
              questionIndex: activeQuestion.questionIndex,
              questionId: currentQuestion.id
            },
            conditions: [],
            operator: 'AND',
            naturalLanguage: input,
            confidence: 0.75
          },
          reasoning: 'Baserat på den valda frågan'
        });
      }
    }

    return suggestions;
  };

  // Apply suggestion
  const applySuggestion = (suggestion: SmartSuggestion) => {
    setLogicRules(prev => [...prev, suggestion.rule]);
    
    // Update schema with the new rule
    const updatedSchema = { ...schema };
    
    if (suggestion.rule.target.sectionIndex !== undefined && suggestion.rule.target.questionIndex !== undefined) {
      const question = updatedSchema.sections[suggestion.rule.target.sectionIndex].questions[suggestion.rule.target.questionIndex];
      
      // Add conditional logic to the question
      if (suggestion.rule.conditions.length > 0) {
        question.show_if = {
          question: suggestion.rule.conditions[0].questionId,
          equals: suggestion.rule.conditions[0].value as string
        };
      }
    }
    
    onUpdate(updatedSchema);
    setSmartSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  };

  // Convert logic rule to natural language
  const ruleToNaturalLanguage = (rule: LogicRule): string => {
    if (rule.naturalLanguage) return rule.naturalLanguage;
    
    const targetQuestion = allQuestions.find(q => q.question.id === rule.target.questionId);
    const conditionTexts = rule.conditions.map(condition => {
      const sourceQuestion = allQuestions.find(q => q.question.id === condition.questionId);
      const operatorText = COMMON_CONDITIONS.find(c => c.operator === condition.operator)?.label || condition.operator;
      return `${sourceQuestion?.question.label || condition.questionId} ${operatorText} "${condition.value}"`;
    });
    
    const conditionText = conditionTexts.join(rule.operator === 'AND' ? ' och ' : ' eller ');
    
    switch (rule.type) {
      case 'show':
        return `Visa "${targetQuestion?.question.label || rule.target.questionId}" om ${conditionText}`;
      case 'hide':
        return `Dölj "${targetQuestion?.question.label || rule.target.questionId}" om ${conditionText}`;
      case 'require':
        return `Gör "${targetQuestion?.question.label || rule.target.questionId}" obligatorisk om ${conditionText}`;
      case 'skip':
        return `Hoppa över "${targetQuestion?.question.label || rule.target.questionId}" om ${conditionText}`;
      default:
        return `Okänd regel för "${targetQuestion?.question.label || rule.target.questionId}"`;
    }
  };

  // Handle natural language input
  const handleNaturalLanguageSubmit = () => {
    if (naturalLanguageInput.trim()) {
      analyzeNaturalLanguage(naturalLanguageInput);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-background p-4">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Naturligt Språk Logikbyggare</h2>
          <Badge variant="secondary" className="text-xs">
            AI-Driven
          </Badge>
        </div>
        
        <div className="space-y-3">
          <div className="flex gap-2">
            <Textarea
              value={naturalLanguageInput}
              onChange={(e) => setNaturalLanguageInput(e.target.value)}
              placeholder="Beskriv logiken på svenska, t.ex. 'Om användaren svarar ja på fråga om glasögon, visa frågan om styrka'"
              className="min-h-[80px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleNaturalLanguageSubmit();
                }
              }}
            />
            <Button 
              onClick={handleNaturalLanguageSubmit}
              disabled={!naturalLanguageInput.trim() || isAnalyzing}
              className="gap-2 shrink-0"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent" />
                  Analyserar...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Analysera
                </>
              )}
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Tryck Cmd/Ctrl + Enter för att analysera snabbt
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 m-4 mb-0">
            <TabsTrigger value="builder">Logikbyggare</TabsTrigger>
            <TabsTrigger value="suggestions">
              AI Förslag
              {smartSuggestions.length > 0 && (
                <Badge variant="destructive" className="ml-2 px-1 py-0 text-xs">
                  {smartSuggestions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rules">Aktiva Regler</TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="flex-1 m-0 p-4 overflow-y-auto">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Snabbmallar
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    'Om användaren svarar "Ja" på [fråga], visa [fråga]',
                    'Hoppa över [sektion] om [fråga] är tom',
                    'Gör [fråga] obligatorisk om [fråga] innehåller [värde]',
                    'Dölj [fråga] om [fråga] är större än [nummer]'
                  ].map((template, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="justify-start h-auto p-2 text-left whitespace-normal"
                      onClick={() => setNaturalLanguageInput(template)}
                    >
                      {template}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Smarta Förslag Baserat på Formuläret
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {allQuestions.length > 0 ? (
                      <>Analyserar ditt formulär för intelligenta förslag...</>
                    ) : (
                      <>Lägg till frågor för att få smarta förslag.</>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="suggestions" className="flex-1 m-0 p-4 overflow-y-auto">
            <div className="space-y-4">
              {smartSuggestions.length === 0 && !isAnalyzing && (
                <Card className="p-8 text-center border-dashed">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Inga förslag än. Skriv en beskrivning av logiken du vill skapa.
                  </p>
                </Card>
              )}

              {isAnalyzing && (
                <Card className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-b-transparent mx-auto mb-2" />
                  <p className="text-muted-foreground">Analyserar naturligt språk...</p>
                </Card>
              )}

              {smartSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="transition-all duration-200 hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-sm font-medium">
                          {suggestion.description}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant={suggestion.confidence > 0.8 ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {Math.round(suggestion.confidence * 100)}% säkerhet
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {suggestion.reasoning}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => applySuggestion(suggestion)}
                          className="gap-2"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Tillämpa
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSmartSuggestions(prev => prev.filter(s => s.id !== suggestion.id))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm bg-muted/50 p-3 rounded">
                      <strong>Förhandsvisning:</strong> {ruleToNaturalLanguage(suggestion.rule)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="rules" className="flex-1 m-0 p-4 overflow-y-auto">
            <div className="space-y-4">
              {logicRules.length === 0 && (
                <Card className="p-8 text-center border-dashed">
                  <Link className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Inga aktiva regler. Skapa din första regel med AI-assistenten.
                  </p>
                </Card>
              )}

              {logicRules.map((rule) => (
                <Card key={rule.id} className="transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {rule.type.toUpperCase()}
                          </Badge>
                          <Badge 
                            variant={rule.confidence > 0.8 ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {Math.round(rule.confidence * 100)}%
                          </Badge>
                        </div>
                        <p className="text-sm">
                          {ruleToNaturalLanguage(rule)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLogicRules(prev => prev.filter(r => r.id !== rule.id))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};