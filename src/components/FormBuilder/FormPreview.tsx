/**
 * Form Preview Component
 * Real-time preview of form as it's being built.
 * Shows how the form will look to end users with proper styling
 * and conditional logic visualization.
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; 
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

import { FormTemplate, FormSection, FormQuestion } from '@/types/anamnesis';

interface FormPreviewProps {
  schema: FormTemplate;
  mode?: 'patient' | 'optician' | 'both';
}

export const FormPreview: React.FC<FormPreviewProps> = ({ 
  schema, 
  mode = 'both' 
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [showHidden, setShowHidden] = useState(false);

  const updateFormData = (questionId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const shouldShowQuestion = (question: FormQuestion): boolean => {
    // Mode filtering
    if (mode !== 'both' && question.show_in_mode && question.show_in_mode !== mode) {
      return false;
    }

    // Conditional logic
    if (question.show_if) {
      const conditionMet = formData[question.show_if.question_id] === question.show_if.answer_value;
      return conditionMet;
    }

    return true;
  };

  const renderQuestion = (question: FormQuestion, sectionIndex: number, questionIndex: number) => {
    const isVisible = shouldShowQuestion(question);
    const value = formData[question.id] || '';

    if (!isVisible && !showHidden) {
      return null;
    }

    const questionElement = (
      <div 
        key={`${question.id}-${sectionIndex}-${questionIndex}`}
        className={`space-y-2 ${!isVisible ? 'opacity-50 border border-dashed border-muted rounded-lg p-3' : ''}`}
      >
        <div className="flex items-center gap-2">
          <Label htmlFor={question.id} className="text-sm font-medium">
            {question.label}
            {question.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          
          {!isVisible && showHidden && (
            <Badge variant="secondary" className="text-xs">
              <EyeOff className="h-3 w-3 mr-1" />
              Dold
            </Badge>
          )}
          
          {question.show_in_mode && mode === 'both' && (
            <Badge variant="outline" className="text-xs">
              {question.show_in_mode === 'patient' ? 'Patient' : 'Optiker'}
            </Badge>
          )}
        </div>

        {question.help_text && (
          <p className="text-xs text-muted-foreground">{question.help_text}</p>
        )}

        {renderQuestionInput(question, value)}

        {question.show_if && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Visas om "{question.show_if.question_id}" = "{question.show_if.answer_value}"
          </div>
        )}
      </div>
    );

    return questionElement;
  };

  const renderQuestionInput = (question: FormQuestion, value: any) => {
    const commonProps = {
      id: question.id,
      disabled: !shouldShowQuestion(question),
    };

    switch (question.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'url':
        return (
          <Input
            {...commonProps}
            type={question.type}
            value={value}
            onChange={(e) => updateFormData(question.id, e.target.value)}
            placeholder={question.placeholder}
          />
        );

      case 'number':
        return (
          <Input
            {...commonProps}
            type="number"
            value={value}
            onChange={(e) => updateFormData(question.id, e.target.value)}
            placeholder={question.placeholder}
          />
        );

      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            value={value}
            onChange={(e) => updateFormData(question.id, e.target.value)}
            placeholder={question.placeholder}
            rows={3}
          />
        );

      case 'date':
        return (
          <Input
            {...commonProps}
            type="date"
            value={value}
            onChange={(e) => updateFormData(question.id, e.target.value)}
          />
        );

      case 'radio':
        return (
          <RadioGroup
            value={value}
            onValueChange={(newValue) => updateFormData(question.id, newValue)}
            disabled={!shouldShowQuestion(question)}
          >
            {question.options?.map((option, index) => {
              const optionValue = typeof option === 'string' ? option : option.value || '';
              const optionLabel = typeof option === 'string' ? option : option.value || '';
              
              return (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={optionValue} id={`${question.id}-${index}`} />
                  <Label htmlFor={`${question.id}-${index}`} className="text-sm">
                    {optionLabel}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {question.options?.map((option, index) => {
              const optionValue = typeof option === 'string' ? option : option.value || '';
              const optionLabel = typeof option === 'string' ? option : option.value || '';
              const isChecked = Array.isArray(value) ? value.includes(optionValue) : false;
              
              return (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${question.id}-${index}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const currentValues = Array.isArray(value) ? value : [];
                      if (checked) {
                        updateFormData(question.id, [...currentValues, optionValue]);
                      } else {
                        updateFormData(question.id, currentValues.filter(v => v !== optionValue));
                      }
                    }}
                    disabled={!shouldShowQuestion(question)}
                  />
                  <Label htmlFor={`${question.id}-${index}`} className="text-sm">
                    {optionLabel}
                  </Label>
                </div>
              );
            })}
          </div>
        );

      case 'dropdown':
        return (
          <Select
            value={value}
            onValueChange={(newValue) => updateFormData(question.id, newValue)}
            disabled={!shouldShowQuestion(question)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Välj alternativ..." />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option, index) => {
                const optionValue = typeof option === 'string' ? option : option.value || '';
                const optionLabel = typeof option === 'string' ? option : option.value || '';
                
                return (
                  <SelectItem key={index} value={optionValue}>
                    {optionLabel}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        );

      default:
        return (
          <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
            Okänd frågetyp: {question.type}
          </div>
        );
    }
  };

  const totalQuestions = useMemo(() => {
    return schema.sections?.reduce((total, section) => total + section.questions.length, 0) || 0;
  }, [schema.sections]);

  const visibleQuestions = useMemo(() => {
    return schema.sections?.reduce((total, section) => {
      return total + section.questions.filter(shouldShowQuestion).length;
    }, 0) || 0;
  }, [schema.sections, formData, mode]);

  if (!schema.sections || schema.sections.length === 0) {
    return (
      <div className="p-8 text-center">
        <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Ingen förhandsvisning</h3>
        <p className="text-muted-foreground">
          Lägg till sektioner och frågor för att se förhandsvisningen
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Preview header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            {schema.title || 'Untitled Form'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {visibleQuestions} av {totalQuestions} frågor visas
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Eye className="h-3 w-3" />
            {mode === 'both' ? 'Alla lägen' : mode === 'patient' ? 'Patient' : 'Optiker'}
          </Badge>
          
          {totalQuestions > visibleQuestions && (
            <Badge 
              variant={showHidden ? "default" : "secondary"}
              className="cursor-pointer gap-1"
              onClick={() => setShowHidden(!showHidden)}
            >
              {showHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {showHidden ? 'Dölj' : 'Visa'} dolda
            </Badge>
          )}
        </div>
      </div>

      {/* Form sections */}
      <div className="space-y-6">
        {schema.sections.map((section, sectionIndex) => {
          const visibleSectionQuestions = section.questions.filter(shouldShowQuestion);
          
          if (visibleSectionQuestions.length === 0 && !showHidden) {
            return null;
          }

          return (
            <Card key={sectionIndex}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {section.section_title}
                </CardTitle>
                {section.questions.length !== visibleSectionQuestions.length && (
                  <p className="text-sm text-muted-foreground">
                    {visibleSectionQuestions.length} av {section.questions.length} frågor visas
                  </p>
                )}
              </CardHeader>
              
              <CardContent className="space-y-4">
                {section.questions.map((question, questionIndex) => 
                  renderQuestion(question, sectionIndex, questionIndex)
                )}
                
                {section.questions.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <p>Inga frågor i denna sektion</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};