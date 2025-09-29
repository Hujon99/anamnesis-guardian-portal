/**
 * Question Suggestions Component
 * Provides smart suggestions for adding new questions based on context
 * and common patterns to help users build forms more efficiently.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Lightbulb, 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Sparkles,
  Target,
  Users,
  Calendar,
  Mail,
  Phone,
  Star
} from 'lucide-react';
import { FormQuestion, FormSection, FormTemplate } from '@/types/anamnesis';
import { generateUniqueQuestionId } from '@/utils/questionIdUtils';

interface QuestionSuggestionsProps {
  currentSection: FormSection;
  sectionIndex: number;
  schema: FormTemplate;
  onAddQuestion: (question: FormQuestion) => void;
}

interface QuestionSuggestion {
  id: string;
  label: string;
  type: string;
  options?: string[];
  category: string;
  icon: React.ReactNode;
  description: string;
  required?: boolean;
  placeholder?: string;
}

const COMMON_SUGGESTIONS: QuestionSuggestion[] = [
  // Contact Information
  {
    id: 'contact_email',
    label: 'E-postadress',
    type: 'email',
    category: 'Kontaktinformation',
    icon: <Mail className="h-4 w-4" />,
    description: 'Samla in användarens e-postadress',
    required: true,
    placeholder: 'exempel@email.se'
  },
  {
    id: 'contact_phone',
    label: 'Telefonnummer',
    type: 'tel',
    category: 'Kontaktinformation',
    icon: <Phone className="h-4 w-4" />,
    description: 'Samla in användarens telefonnummer',
    placeholder: '070-123 45 67'
  },
  {
    id: 'birth_date',
    label: 'Födelsedatum',
    type: 'date',
    category: 'Personuppgifter',
    icon: <Calendar className="h-4 w-4" />,
    description: 'Användarens födelsedatum',
    required: true
  },
  
  // Rating and Feedback
  {
    id: 'satisfaction_rating',
    label: 'Hur nöjd är du med tjänsten?',
    type: 'radio',
    options: ['Mycket nöjd', 'Nöjd', 'Neutral', 'Missnöjd', 'Mycket missnöjd'],
    category: 'Feedback',
    icon: <Star className="h-4 w-4" />,
    description: 'Samla in användarens nöjdhet'
  },
  
  // Yes/No Questions
  {
    id: 'terms_agreement',
    label: 'Jag godkänner villkoren',
    type: 'radio',
    options: ['Ja', 'Nej'],
    category: 'Avtal',
    icon: <Target className="h-4 w-4" />,
    description: 'Godkännande av villkor',
    required: true
  },
  
  // Follow-up Questions
  {
    id: 'additional_comments',
    label: 'Ytterligare kommentarer',
    type: 'textarea',
    category: 'Uppföljning',
    icon: <Users className="h-4 w-4" />,
    description: 'Låt användaren lämna ytterligare kommentarer',
    placeholder: 'Skriv dina kommentarer här...'
  }
];

// Medical-specific suggestions based on examination type
const MEDICAL_SUGGESTIONS: Record<string, QuestionSuggestion[]> = {
  'Synundersökning': [
    {
      id: 'vision_problems',
      label: 'Har du några synproblem?',
      type: 'radio',
      options: ['Ja', 'Nej', 'Osäker'],
      category: 'Synhälsa',
      icon: <Target className="h-4 w-4" />,
      description: 'Grundläggande screening för synproblem'
    },
    {
      id: 'glasses_usage',
      label: 'Använder du glasögon eller linser?',
      type: 'radio',
      options: ['Glasögon', 'Kontaktlinser', 'Båda', 'Inget'],
      category: 'Synhälsa',
      icon: <Target className="h-4 w-4" />,
      description: 'Information om nuvarande synhjälpmedel'
    },
    {
      id: 'eye_strain',
      label: 'Upplever du ögontrötthet vid skärmarbete?',
      type: 'radio',
      options: ['Ofta', 'Ibland', 'Sällan', 'Aldrig'],
      category: 'Synhälsa',
      icon: <Target className="h-4 w-4" />,
      description: 'Screening för digital ögontrötthet'
    }
  ]
};

export const QuestionSuggestions: React.FC<QuestionSuggestionsProps> = ({
  currentSection,
  sectionIndex,
  schema,
  onAddQuestion
}) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  
  // Get examination type to provide context-specific suggestions
  const examinationType = schema.title?.includes('Syn') ? 'Synundersökning' : 'General';
  
  // Combine common and context-specific suggestions
  const allSuggestions = [
    ...COMMON_SUGGESTIONS,
    ...(MEDICAL_SUGGESTIONS[examinationType] || [])
  ];
  
  // Group suggestions by category
  const suggestionsByCategory = allSuggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.category]) {
      acc[suggestion.category] = [];
    }
    acc[suggestion.category].push(suggestion);
    return acc;
  }, {} as Record<string, QuestionSuggestion[]>);
  
  // Check if a question already exists in the form
  const questionExists = (suggestionId: string) => {
    return schema.sections.some(section =>
      section.questions.some(q => q.id.includes(suggestionId) || q.label.includes(suggestionId))
    );
  };
  
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };
  
  const handleAddSuggestion = (suggestion: QuestionSuggestion) => {
    const uniqueId = generateUniqueQuestionId(suggestion.label, schema);
    
    const newQuestion: FormQuestion = {
      id: uniqueId,
      label: suggestion.label,
      type: suggestion.type as any,
      options: suggestion.options,
      required: suggestion.required,
      placeholder: suggestion.placeholder
    };
    
    onAddQuestion(newQuestion);
  };
  
  // Analyze current section to provide smart suggestions
  const getSmartSuggestions = () => {
    const currentQuestions = currentSection.questions;
    const hasContactInfo = currentQuestions.some(q => 
      q.type === 'email' || q.type === 'tel' || q.label.toLowerCase().includes('kontakt')
    );
    const hasPersonalInfo = currentQuestions.some(q => 
      q.type === 'date' || q.label.toLowerCase().includes('född')
    );
    
    const suggestions = [];
    
    if (!hasContactInfo && currentSection.section_title.toLowerCase().includes('kontakt')) {
      suggestions.push('Kontaktinformation');
    }
    
    if (!hasPersonalInfo && currentSection.section_title.toLowerCase().includes('person')) {
      suggestions.push('Personuppgifter');
    }
    
    return suggestions;
  };
  
  const smartSuggestions = getSmartSuggestions();
  
  return (
    <Card className="border-dashed border-accent/50 bg-accent/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-accent" />
          <CardTitle className="text-sm">Frågeförslag</CardTitle>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Smart
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Smart suggestions based on context */}
        {smartSuggestions.length > 0 && (
          <div className="p-2 bg-primary/10 rounded border border-primary/20">
            <div className="flex items-center gap-1 mb-2">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium text-primary">Föreslaget för denna sektion:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {smartSuggestions.map(category => (
                <Button
                  key={category}
                  variant="outline"
                  size="sm"
                  className="text-xs h-6"
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {/* Categorized suggestions */}
        <div className="space-y-2">
          {Object.entries(suggestionsByCategory).map(([category, suggestions]) => (
            <Collapsible
              key={category}
              open={expandedCategories.includes(category)}
              onOpenChange={() => toggleCategory(category)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between text-xs h-8 px-2"
                >
                  <div className="flex items-center gap-2">
                    {suggestions[0].icon}
                    <span>{category}</span>
                    <Badge variant="outline" className="text-xs">
                      {suggestions.length}
                    </Badge>
                  </div>
                  {expandedCategories.includes(category) ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-1 mt-1">
                {suggestions.map(suggestion => {
                  const exists = questionExists(suggestion.id);
                  
                  return (
                    <div
                      key={suggestion.id}
                      className={`p-2 rounded border text-xs ${
                        exists 
                          ? 'bg-muted/50 border-muted text-muted-foreground'
                          : 'bg-background border-border hover:bg-accent/20 cursor-pointer'
                      }`}
                      onClick={() => !exists && handleAddSuggestion(suggestion)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{suggestion.label}</div>
                          <div className="text-muted-foreground mt-1">
                            {suggestion.description}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 ml-2">
                          <Badge variant="outline" className="text-xs">
                            {suggestion.type}
                          </Badge>
                          {!exists ? (
                            <Button size="sm" className="h-6 w-6 p-0">
                              <Plus className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Finns
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};