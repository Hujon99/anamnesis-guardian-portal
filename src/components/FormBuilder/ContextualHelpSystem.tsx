/**
 * Contextual Help System Component
 * Provides interactive guidance, smart tips, help tooltips, and pattern recognition
 * to help users build better forms with reduced learning curve.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  HelpCircle, 
  Lightbulb, 
  BookOpen, 
  Target, 
  CheckCircle, 
  ArrowRight,
  X,
  PlayCircle,
  Pause,
  RotateCcw,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Info
} from 'lucide-react';
import { FormTemplate, FormQuestion, FormSection } from '@/types/anamnesis';

interface ContextualHelpSystemProps {
  schema: FormTemplate;
  currentTab: string;
  activeQuestion?: { sectionIndex: number; questionIndex: number };
  onNavigate?: (tab: string, sectionIndex?: number, questionIndex?: number) => void;
}

interface HelpTip {
  id: string;
  type: 'suggestion' | 'warning' | 'info' | 'best-practice';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  priority: number;
  context: string[];
}

interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  optional?: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Välkommen till Formulärbyggaren',
    description: 'Här kan du skapa professionella formulär med avancerad logik och design.',
    target: 'form-builder',
    position: 'bottom'
  },
  {
    id: 'form-metadata',
    title: 'Formulärinformation',
    description: 'Börja med att ge ditt formulär en titel och välj undersökningstyp.',
    target: 'form-metadata',
    position: 'bottom'
  },
  {
    id: 'sections-tab',
    title: 'Sektioner',
    description: 'Organisera ditt formulär i logiska sektioner. Klicka här för att börja.',
    target: 'sections-tab',
    position: 'bottom'
  },
  {
    id: 'add-section',
    title: 'Lägg till sektioner',
    description: 'Skapa din första sektion genom att klicka här.',
    target: 'add-section-btn',
    position: 'left'
  },
  {
    id: 'question-types',
    title: 'Frågetyper',
    description: 'Välj mellan olika frågetyper beroende på vilken typ av svar du vill samla in.',
    target: 'question-type-selector',
    position: 'top'
  },
  {
    id: 'conditional-logic',
    title: 'Villkorlig logik',
    description: 'Skapa smarta formulär som anpassar sig baserat på användarens svar.',
    target: 'conditional-logic',
    position: 'right'
  },
  {
    id: 'preview',
    title: 'Förhandsgranskning',
    description: 'Se hur ditt formulär kommer att se ut för användarna.',
    target: 'preview-toggle',
    position: 'bottom'
  }
];

const BEST_PRACTICES = [
  {
    id: 'short-forms',
    title: 'Håll formulär korta',
    description: 'Formulär med färre än 10 frågor har 25% högre genomförandegrad.',
    pattern: (schema: FormTemplate) => {
      const totalQuestions = schema.sections.reduce((total, section) => total + section.questions.length, 0);
      return totalQuestions > 15;
    }
  },
  {
    id: 'logical-grouping',
    title: 'Gruppera relaterade frågor',
    description: 'Placera liknande frågor i samma sektion för bättre användarupplevelse.',
    pattern: (schema: FormTemplate) => schema.sections.length < 2 && schema.sections[0]?.questions.length > 8
  },
  {
    id: 'required-fields',
    title: 'Begränsa obligatoriska fält',
    description: 'För många obligatoriska fält kan skrämma bort användare.',
    pattern: (schema: FormTemplate) => {
      const totalQuestions = schema.sections.reduce((total, section) => total + section.questions.length, 0);
      const requiredQuestions = schema.sections.reduce((total, section) => 
        total + section.questions.filter(q => q.required).length, 0);
      return totalQuestions > 0 && (requiredQuestions / totalQuestions) > 0.5;
    }
  }
];

export const ContextualHelpSystem: React.FC<ContextualHelpSystemProps> = ({
  schema,
  currentTab,
  activeQuestion,
  onNavigate
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [activeTour, setActiveTour] = useState<string | null>(null);
  const [currentTourStep, setCurrentTourStep] = useState(0);
  const [dismissedTips, setDismissedTips] = useState<string[]>([]);
  const [tourProgress, setTourProgress] = useState(0);
  const helpRef = useRef<HTMLDivElement>(null);

  // Generate contextual tips based on current state
  const generateContextualTips = (): HelpTip[] => {
    const tips: HelpTip[] = [];
    
    // Analyze schema for improvements
    BEST_PRACTICES.forEach((practice) => {
      if (practice.pattern(schema) && !dismissedTips.includes(practice.id)) {
        tips.push({
          id: practice.id,
          type: 'suggestion',
          title: practice.title,
          description: practice.description,
          priority: 2,
          context: ['schema']
        });
      }
    });

    // Context-specific tips
    if (currentTab === 'sections') {
      if (schema.sections.length === 0) {
        tips.push({
          id: 'first-section',
          type: 'info',
          title: 'Skapa din första sektion',
          description: 'Börja med att skapa en sektion för att organisera dina frågor.',
          action: {
            label: 'Lägg till sektion',
            onClick: () => {
              // This would trigger adding a section
            }
          },
          priority: 1,
          context: ['sections', 'empty']
        });
      }
      
      if (schema.sections.some(section => section.questions.length === 0)) {
        tips.push({
          id: 'empty-sections',
          type: 'warning',
          title: 'Tomma sektioner',
          description: 'Du har sektioner utan frågor. Lägg till frågor eller ta bort tomma sektioner.',
          priority: 2,
          context: ['sections']
        });
      }
    }

    if (currentTab === 'logic') {
      const hasConditionalLogic = schema.sections.some(section => 
        section.questions.some(q => q.show_if) || section.show_if
      );
      
      if (!hasConditionalLogic) {
        tips.push({
          id: 'add-conditional-logic',
          type: 'suggestion',
          title: 'Använd villkorlig logik',
          description: 'Gör ditt formulär smartare genom att visa/dölja frågor baserat på svar.',
          priority: 2,
          context: ['logic']
        });
      }
    }

    if (activeQuestion) {
      const question = schema.sections[activeQuestion.sectionIndex]?.questions[activeQuestion.questionIndex];
      if (question) {
        if (!question.help_text) {
          tips.push({
            id: 'add-help-text',
            type: 'best-practice',
            title: 'Lägg till hjälptext',
            description: 'Hjälptext gör det enklare för användare att förstå vad du vill ha för svar.',
            priority: 3,
            context: ['question']
          });
        }

        if (question.type === 'text' && !question.placeholder) {
          tips.push({
            id: 'add-placeholder',
            type: 'suggestion',
            title: 'Lägg till placeholder',
            description: 'Placeholder-text hjälper användare att förstå vilken typ av svar som förväntas.',
            priority: 3,
            context: ['question']
          });
        }
      }
    }

    return tips.sort((a, b) => a.priority - b.priority);
  };

  const contextualTips = generateContextualTips();

  // Start interactive tour
  const startTour = (tourType: string) => {
    setActiveTour(tourType);
    setCurrentTourStep(0);
    setTourProgress(0);
  };

  // Next tour step
  const nextTourStep = () => {
    if (currentTourStep < TOUR_STEPS.length - 1) {
      setCurrentTourStep(prev => prev + 1);
      setTourProgress(((currentTourStep + 1) / TOUR_STEPS.length) * 100);
    } else {
      finishTour();
    }
  };

  // Previous tour step
  const previousTourStep = () => {
    if (currentTourStep > 0) {
      setCurrentTourStep(prev => prev - 1);
      setTourProgress((currentTourStep / TOUR_STEPS.length) * 100);
    }
  };

  // Finish tour
  const finishTour = () => {
    setActiveTour(null);
    setCurrentTourStep(0);
    setTourProgress(0);
  };

  // Dismiss tip
  const dismissTip = (tipId: string) => {
    setDismissedTips(prev => [...prev, tipId]);
  };

  const currentTourStepData = TOUR_STEPS[currentTourStep];

  return (
    <>
      {/* Help button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowHelp(!showHelp)}
        className={`fixed bottom-6 right-6 z-50 shadow-lg ${showHelp ? 'bg-primary text-primary-foreground' : ''}`}
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        Hjälp
      </Button>

      {/* Help panel */}
      {showHelp && (
        <Card 
          ref={helpRef}
          className="fixed bottom-20 right-6 w-80 max-h-96 z-50 shadow-xl border-2"
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Hjälpcenter
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHelp(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <Tabs defaultValue="tips" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mx-4">
              <TabsTrigger value="tips" className="text-xs">Tips</TabsTrigger>
              <TabsTrigger value="tour" className="text-xs">Guidning</TabsTrigger>
              <TabsTrigger value="docs" className="text-xs">Docs</TabsTrigger>
            </TabsList>

            <TabsContent value="tips" className="mt-2">
              <ScrollArea className="h-72 px-4">
                <div className="space-y-3">
                  {contextualTips.length === 0 && (
                    <div className="text-center py-6">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-accent_teal" />
                      <p className="text-sm text-muted-foreground">
                        Inga förbättringsförslag just nu. Bra jobbat!
                      </p>
                    </div>
                  )}

                  {contextualTips.map((tip) => (
                    <Card key={tip.id} className="p-3 border-l-4 border-l-primary/20">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {tip.type === 'suggestion' && <Lightbulb className="h-3 w-3 text-yellow-500" />}
                            {tip.type === 'warning' && <AlertTriangle className="h-3 w-3 text-orange-500" />}
                            {tip.type === 'info' && <Info className="h-3 w-3 text-blue-500" />}
                            {tip.type === 'best-practice' && <TrendingUp className="h-3 w-3 text-green-500" />}
                            <span className="text-xs font-medium">{tip.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {tip.description}
                          </p>
                          {tip.action && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs"
                              onClick={tip.action.onClick}
                            >
                              {tip.action.label}
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissTip(tip.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="tour" className="mt-2">
              <div className="px-4 space-y-4">
                {!activeTour ? (
                  <>
                    <div className="text-center">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <h4 className="font-medium mb-2">Interaktiv guidning</h4>
                      <p className="text-xs text-muted-foreground mb-4">
                        Lär dig grunderna genom en steg-för-steg guidning.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Button
                        onClick={() => startTour('basic')}
                        className="w-full gap-2 h-8 text-xs"
                      >
                        <PlayCircle className="h-3 w-3" />
                        Grundläggande guidning
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => startTour('advanced')}
                        className="w-full gap-2 h-8 text-xs"
                      >
                        <Target className="h-3 w-3" />
                        Avancerade funktioner
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Steg {currentTourStep + 1} av {TOUR_STEPS.length}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={finishTour}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <Progress value={tourProgress} className="h-2" />

                    <Card className="p-3">
                      <h4 className="font-medium mb-2">{currentTourStepData?.title}</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {currentTourStepData?.description}
                      </p>
                    </Card>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={previousTourStep}
                        disabled={currentTourStep === 0}
                        className="flex-1"
                      >
                        Föregående
                      </Button>
                      <Button
                        size="sm"
                        onClick={nextTourStep}
                        className="flex-1"
                      >
                        {currentTourStep === TOUR_STEPS.length - 1 ? 'Avsluta' : 'Nästa'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="docs" className="mt-2">
              <ScrollArea className="h-72 px-4">
                <div className="space-y-3">
                  <div className="text-center mb-4">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h4 className="font-medium">Dokumentation</h4>
                  </div>

                  {[
                    { title: 'Kom igång', description: 'Grunderna för att skapa formulär' },
                    { title: 'Frågetyper', description: 'Olika typer av frågor och när de används' },
                    { title: 'Villkorlig logik', description: 'Skapa smarta, anpassningsbara formulär' },
                    { title: 'Bästa praxis', description: 'Tips för effektiva formulär' },
                    { title: 'Tillgänglighet', description: 'Gör formulär tillgängliga för alla' }
                  ].map((item, index) => (
                    <Card key={index} className="p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                      <h5 className="font-medium text-sm mb-1">{item.title}</h5>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>
      )}

      {/* Tour overlay */}
      {activeTour && currentTourStepData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={finishTour}>
          <div className="absolute inset-0 pointer-events-none">
            {/* Tour step highlight would go here */}
          </div>
        </div>
      )}
    </>
  );
};