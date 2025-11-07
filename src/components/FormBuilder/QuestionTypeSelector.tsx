/**
 * Question Type Selector Component
 * Provides a user-friendly dropdown for selecting question types with icons,
 * descriptions, and usage examples to help users understand each type.
 */

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { 
  Type, 
  AlignLeft, 
  Circle, 
  CheckSquare, 
  ChevronDown
} from 'lucide-react';

const QUESTION_TYPES = [
  { 
    value: 'text', 
    label: 'Textfält',
    icon: Type,
    description: 'Kort fritext för namn, adress etc.',
    color: 'text-blue-500'
  },
  { 
    value: 'textarea', 
    label: 'Textområde',
    icon: AlignLeft,
    description: 'Längre fritext för beskrivningar',
    color: 'text-blue-600'
  },
  { 
    value: 'checkbox', 
    label: 'Kryssrutor',
    icon: CheckSquare,
    description: 'Välj flera alternativ (t.ex. symptom)',
    color: 'text-teal-600'
  },
  { 
    value: 'radio', 
    label: 'Radioknappar',
    icon: Circle,
    description: 'Välj ett alternativ (t.ex. kön)',
    color: 'text-teal-500'
  },
  { 
    value: 'dropdown', 
    label: 'Dropdown',
    icon: ChevronDown,
    description: 'Som radioknappar men sparar plats',
    color: 'text-teal-700'
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
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 flex-shrink-0 ${selectedType?.color || 'text-muted-foreground'}`} />
          <span className="truncate">{selectedType?.label || 'Välj typ'}</span>
        </div>
      </SelectTrigger>
      <SelectContent className="bg-background z-50 shadow-lg border min-w-[280px] max-h-[400px]">
        {QUESTION_TYPES.map((type) => {
          const TypeIcon = type.icon;
          return (
            <SelectItem 
              key={type.value} 
              value={type.value}
              className="cursor-pointer hover:bg-accent/50 transition-colors py-3"
            >
              <div className="flex items-center gap-3 w-full">
                <TypeIcon className={`h-4 w-4 flex-shrink-0 ${type.color}`} />
                <div className="flex flex-col items-start gap-0.5 flex-1 min-w-0">
                  <span className="font-medium text-sm">{type.label}</span>
                  <span className="text-xs text-muted-foreground leading-tight">
                    {type.description}
                  </span>
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
