/**
 * Searchable Question Picker Component
 * Provides a searchable dropdown for selecting dependency questions in conditional logic.
 * Features search by text and ID, grouping by section, and highlighting of question types.
 */

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  label: string;
  type: string;
  sectionTitle?: string;
  options?: Array<string | { value: string; triggers_followups: boolean; }>;
}

interface SearchableQuestionPickerProps {
  questions: Question[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  suggestedQuestionId?: string; // ID of the question that appears just before current one
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  textarea: 'Textområde',
  radio: 'Radio',
  checkbox: 'Kryssrutor',
  dropdown: 'Dropdown',
  date: 'Datum',
  number: 'Nummer',
  email: 'E-post',
  tel: 'Telefon',
  url: 'URL'
};

export const SearchableQuestionPicker: React.FC<SearchableQuestionPickerProps> = ({
  questions,
  value,
  onValueChange,
  placeholder = 'Sök fråga...',
  emptyMessage = 'Ingen fråga hittades.',
  className,
  suggestedQuestionId
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedQuestion = questions.find(q => q.id === value);

  // Group questions by section
  const groupedQuestions = useMemo(() => {
    const groups: Record<string, Question[]> = {};
    
    questions.forEach(q => {
      const sectionKey = q.sectionTitle || 'Utan sektion';
      if (!groups[sectionKey]) {
        groups[sectionKey] = [];
      }
      groups[sectionKey].push(q);
    });
    
    return groups;
  }, [questions]);

  // Filter questions based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groupedQuestions;

    const filtered: Record<string, Question[]> = {};
    const query = searchQuery.toLowerCase();

    Object.entries(groupedQuestions).forEach(([section, sectionQuestions]) => {
      const matchingQuestions = sectionQuestions.filter(q => 
        q.label.toLowerCase().includes(query) || 
        q.id.toLowerCase().includes(query) ||
        QUESTION_TYPE_LABELS[q.type]?.toLowerCase().includes(query)
      );

      if (matchingQuestions.length > 0) {
        filtered[section] = matchingQuestions;
      }
    });

    return filtered;
  }, [groupedQuestions, searchQuery]);

  const handleSelect = (questionId: string) => {
    onValueChange(questionId);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between text-left font-normal", className)}
        >
          {selectedQuestion ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="truncate">{selectedQuestion.label}</span>
              <Badge variant="secondary" className="text-xs px-2 py-0 flex-shrink-0">
                {QUESTION_TYPE_LABELS[selectedQuestion.type] || selectedQuestion.type}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Sök på frågetext eller ID..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="flex h-11"
            />
          </div>
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {Object.entries(filteredGroups).map(([section, sectionQuestions]) => (
              <CommandGroup key={section} heading={section}>
                {sectionQuestions.map((question) => {
                  const isSuggested = question.id === suggestedQuestionId;
                  return (
                    <CommandItem
                      key={question.id}
                      value={question.id}
                      onSelect={() => handleSelect(question.id)}
                      className={cn(
                        "flex items-center gap-2 py-3 cursor-pointer",
                        isSuggested && "bg-accent/30 border-l-2 border-l-accent"
                      )}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 flex-shrink-0",
                          value === question.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">
                            {question.label}
                          </span>
                          <Badge 
                            variant="outline" 
                            className="text-xs px-2 py-0 flex-shrink-0"
                          >
                            {QUESTION_TYPE_LABELS[question.type] || question.type}
                          </Badge>
                          {isSuggested && (
                            <Badge 
                              variant="secondary" 
                              className="text-xs px-2 py-0 bg-accent/20 text-accent flex-shrink-0"
                            >
                              ⭐ Föreslagen
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground truncate">
                          ID: {question.id}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
