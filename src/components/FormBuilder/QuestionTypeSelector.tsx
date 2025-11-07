/**
 * Question Type Selector Component
 * Provides a user-friendly dropdown for selecting question types with icons,
 * descriptions, and usage examples to help users understand each type.
 */

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Type, 
  AlignLeft, 
  Circle, 
  CheckSquare, 
  ChevronDown, 
  Calendar, 
  Hash, 
  Mail, 
  Phone, 
  Link as LinkIcon
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

const QUESTION_TYPES = [
  { 
    value: 'text', 
    label: 'Textfråga',
    icon: Type,
    description: 'Kort fritext',
    example: 'T.ex. namn, adress',
    color: 'text-blue-500'
  },
  { 
    value: 'textarea', 
    label: 'Textområde',
    icon: AlignLeft,
    description: 'Längre fritext',
    example: 'T.ex. beskrivning, kommentarer',
    color: 'text-blue-600'
  },
  { 
    value: 'radio', 
    label: 'Radioknappar',
    icon: Circle,
    description: 'Välj ETT alternativ',
    example: 'T.ex. kön, ja/nej',
    color: 'text-teal-500'
  },
  { 
    value: 'checkbox', 
    label: 'Kryssrutor',
    icon: CheckSquare,
    description: 'Välj FLERA alternativ',
    example: 'T.ex. symptom, allergier',
    color: 'text-teal-600'
  },
  { 
    value: 'dropdown', 
    label: 'Dropdown',
    icon: ChevronDown,
    description: 'Sparar plats',
    example: 'T.ex. lista med många alternativ',
    color: 'text-teal-700'
  },
  { 
    value: 'date', 
    label: 'Datum',
    icon: Calendar,
    description: 'Datumväljare',
    example: 'T.ex. födelsedatum',
    color: 'text-coral-500'
  },
  { 
    value: 'number', 
    label: 'Nummer',
    icon: Hash,
    description: 'Endast siffror',
    example: 'T.ex. ålder, blodtryck',
    color: 'text-coral-600'
  },
  { 
    value: 'email', 
    label: 'E-post',
    icon: Mail,
    description: 'E-postadress',
    example: 'T.ex. kontakt@example.com',
    color: 'text-primary'
  },
  { 
    value: 'tel', 
    label: 'Telefon',
    icon: Phone,
    description: 'Telefonnummer',
    example: 'T.ex. +46 70 123 45 67',
    color: 'text-primary'
  },
  { 
    value: 'url', 
    label: 'URL',
    icon: LinkIcon,
    description: 'Webbadress',
    example: 'T.ex. https://example.com',
    color: 'text-primary'
  }
];

interface QuestionTypeSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export const QuestionTypeSelector: React.FC<QuestionTypeSelectorProps> = ({
  value,
  onValueChange,
  className
}) => {
  const selectedType = QUESTION_TYPES.find(t => t.value === value);
  const Icon = selectedType?.icon || Type;

  return (
    <TooltipProvider>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={className}>
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${selectedType?.color || 'text-muted-foreground'}`} />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-background min-w-[320px]">
          {QUESTION_TYPES.map((type) => {
            const TypeIcon = type.icon;
            return (
              <Tooltip key={type.value} delayDuration={300}>
                <TooltipTrigger asChild>
                  <SelectItem value={type.value}>
                    <div className="flex items-center gap-3 w-full py-1">
                      <TypeIcon className={`h-4 w-4 flex-shrink-0 ${type.color}`} />
                      <div className="flex flex-col items-start gap-0.5 flex-1 min-w-0">
                        <span className="font-medium text-sm">{type.label}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-full">
                          {type.description}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[240px]">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <TypeIcon className={`h-4 w-4 ${type.color}`} />
                      <span className="font-semibold text-sm">{type.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {type.description}
                    </p>
                    <div className="pt-1 border-t">
                      <Badge variant="secondary" className="text-xs px-2 py-0.5">
                        {type.example}
                      </Badge>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </SelectContent>
      </Select>
    </TooltipProvider>
  );
};
