/**
 * Enhanced Question Editor with Microinteractions and Animations
 * Provides smooth animations, ripple effects, hover previews, and visual feedback
 * for improved user experience during form building.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronRight, 
  GripVertical, 
  Sparkles,
  Save,
  Eye,
  Zap
} from 'lucide-react';
import { FormQuestion, FormTemplate } from '@/types/anamnesis';

interface AnimatedQuestionEditorProps {
  question: FormQuestion;
  questionIndex: number;
  sectionIndex: number;
  schema: FormTemplate;
  onUpdate: (question: FormQuestion) => void;
  onDelete: () => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  totalQuestions: number;
  isFromDatabase?: boolean;
}

const QUESTION_TYPES = [
  { value: 'text', label: 'Textfråga', icon: '📝' },
  { value: 'textarea', label: 'Textområde', icon: '📄' },
  { value: 'radio', label: 'Radioknappar', icon: '⚪' },
  { value: 'checkbox', label: 'Kryssrutor', icon: '☑️' },
  { value: 'dropdown', label: 'Dropdown', icon: '📋' },
  { value: 'date', label: 'Datum', icon: '📅' },
  { value: 'number', label: 'Nummer', icon: '🔢' },
  { value: 'email', label: 'E-post', icon: '📧' },
  { value: 'tel', label: 'Telefon', icon: '📞' },
  { value: 'url', label: 'URL', icon: '🔗' }
];

export const AnimatedQuestionEditor: React.FC<AnimatedQuestionEditorProps> = ({
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
  const [isHovered, setIsHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Ripple effect on click
  const createRipple = (event: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    
    card.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 800);
  };

  // Animate save feedback
  const handleSave = () => {
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const updateField = (field: keyof FormQuestion, value: any) => {
    onUpdate({
      ...question,
      [field]: value
    });
    handleSave();
  };

  const currentType = QUESTION_TYPES.find(t => t.value === question.type);

  return (
    <Card 
      ref={cardRef}
      className={`
        relative overflow-hidden transition-all duration-300 ease-out
        border-l-4 border-l-primary/20 ripple-container
        ${isHovered ? 'shadow-lg/20 scale-[1.01] border-l-accent_teal' : 'shadow-sm'}
        ${isExpanded ? 'ring-2 ring-primary/10' : ''}
        ${justSaved ? 'animate-pulse-once ring-2 ring-accent_teal' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={createRipple}
    >
      {/* Gradient overlay for enhanced visual appeal */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/60 to-white/0 pointer-events-none opacity-0 transition-opacity duration-300 hover:opacity-100" />
      
      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center gap-2">
          {/* Expand/Collapse with animation */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="transition-transform duration-200 hover:scale-110"
              >
                {isExpanded ? 
                  <ChevronDown className="h-4 w-4 transition-transform duration-200" /> : 
                  <ChevronRight className="h-4 w-4 transition-transform duration-200" />
                }
              </Button>
            </CollapsibleTrigger>
          </Collapsible>

          {/* Drag handle with hover effect */}
          <div className="cursor-grab active:cursor-grabbing touch-none transition-transform duration-200 hover:scale-110 hover:text-accent_teal">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Question label with smooth focus */}
          <div className="flex-1 min-w-0">
            <Input
              value={question.label}
              onChange={(e) => updateField('label', e.target.value)}
              className="font-medium border-none shadow-none p-0 h-auto text-base bg-transparent transition-all duration-200 focus:ring-2 focus:ring-accent_teal/50"
              placeholder="Frågetext..."
            />
          </div>

          {/* Type badge with icon and animation */}
          <Badge 
            variant="secondary" 
            className="transition-all duration-200 hover:scale-105 hover:bg-accent_teal/10 cursor-pointer"
            onClick={() => setShowPreview(!showPreview)}
          >
            <span className="mr-1 text-sm">{currentType?.icon}</span>
            {currentType?.label}
          </Badge>

          {/* Save indicator */}
          {justSaved && (
            <div className="flex items-center gap-1 text-accent_teal animate-fade-in">
              <Sparkles className="h-3 w-3" />
              <span className="text-xs">Sparad!</span>
            </div>
          )}

          {/* Preview toggle with smooth animation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className={`transition-all duration-200 ${showPreview ? 'bg-accent_teal/10 text-accent_teal' : 'hover:bg-accent/50'}`}
          >
            <Eye className={`h-4 w-4 transition-transform duration-200 ${showPreview ? 'scale-110' : ''}`} />
          </Button>
        </div>

        {/* Animated conditional logic indicator */}
        {question.show_if && (
          <div className="mt-2 animate-fade-in">
            <Badge variant="outline" className="text-xs bg-accent_teal/5 border-accent_teal/20">
              <Zap className="h-3 w-3 mr-1" />
              Villkorlig logik aktiv
            </Badge>
          </div>
        )}
      </CardHeader>

      {/* Expandable content with smooth animation */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent className="transition-all duration-300 ease-out data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <CardContent className="pt-0 space-y-4">
            {/* Enhanced content would go here */}
            <div className="space-y-2">
              <Label>Fråge-ID</Label>
              <Input
                value={question.id}
                onChange={(e) => updateField('id', e.target.value)}
                className="transition-all duration-200 focus:ring-2 focus:ring-accent_teal/50"
                placeholder="unik_id"
              />
            </div>

            {/* Type selector with enhanced styling */}
            <div className="space-y-2">
              <Label>Frågetyp</Label>
              <Select value={question.type} onValueChange={(value) => updateField('type', value)}>
                <SelectTrigger className="transition-all duration-200 hover:border-accent_teal/50 focus:ring-accent_teal/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="transition-colors duration-150 hover:bg-accent_teal/5">
                      <span className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        {type.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Required toggle with smooth animation */}
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
                className="transition-all duration-200 data-[state=checked]:bg-accent_teal"
              />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Hover preview overlay */}
      {showPreview && (
        <div className="absolute inset-0 bg-background/95 backdrop-blur-sm animate-fade-in z-20 p-4 rounded-lg">
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-sm font-medium">{question.label}</div>
              <div className="text-xs text-muted-foreground">
                Typ: {currentType?.label}
              </div>
              {question.required && (
                <Badge variant="destructive" className="text-xs">
                  Obligatorisk
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowPreview(false);
            }}
            className="absolute top-2 right-2"
          >
            ×
          </Button>
        </div>
      )}
    </Card>
  );
};