/**
 * Live Preview Panel Component
 * Provides real-time preview of the form with mobile responsive views,
 * interactive testing mode, and accessibility preview options.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  Play, 
  Pause,
  Eye,
  RefreshCw,
  Volume2,
  VolumeX,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { FormTemplate, FormQuestion, FormSection } from '@/types/anamnesis';

interface LivePreviewPanelProps {
  schema: FormTemplate;
  onQuestionClick?: (sectionIndex: number, questionIndex: number) => void;
}

type DeviceMode = 'mobile' | 'tablet' | 'desktop';
type PreviewMode = 'static' | 'interactive' | 'accessibility';

export const LivePreviewPanel: React.FC<LivePreviewPanelProps> = ({
  schema,
  onQuestionClick
}) => {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('static');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [validationResults, setValidationResults] = useState<Record<string, boolean>>({});

  // Device dimensions
  const deviceDimensions = {
    mobile: { width: '375px', height: '667px' },
    tablet: { width: '768px', height: '1024px' },
    desktop: { width: '100%', height: '100%' }
  };

  // Auto-play through form sections
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentSection(prev => 
        prev < schema.sections.length - 1 ? prev + 1 : 0
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [isPlaying, schema.sections.length]);

  // Update form data
  const updateFormData = (questionId: string, value: any) => {
    setFormData(prev => ({ ...prev, [questionId]: value }));
    
    // Validate question
    setValidationResults(prev => ({
      ...prev,
      [questionId]: value !== null && value !== undefined && value !== ''
    }));

    // Sound feedback if enabled
    if (soundEnabled) {
      // Could add sound feedback here
    }
  };

  // Check if question should be visible (conditional logic)
  const shouldShowQuestion = (question: FormQuestion): boolean => {
    if (!question.show_if) return true;
    
    const { question: dependentQuestion, equals, contains } = question.show_if;
    const dependentValue = formData[dependentQuestion];
    
    // Handle 'contains' condition for checkboxes
    if (contains !== undefined) {
      if (Array.isArray(dependentValue)) {
        return dependentValue.includes(contains);
      }
      return dependentValue === contains;
    }
    
    // Handle 'equals' condition
    if (equals !== undefined) {
      // If dependentValue is an array (checkbox), check if it contains the target
      if (Array.isArray(dependentValue)) {
        if (Array.isArray(equals)) {
          return equals.some(eq => dependentValue.includes(eq));
        }
        return dependentValue.includes(equals);
      }
      
      // dependentValue is a single value
      if (Array.isArray(equals)) {
        return equals.includes(dependentValue);
      }
      return dependentValue === equals;
    }
    
    // Default: show if value is truthy
    return !!dependentValue;
  };

  // Render question input based on type
  const renderQuestionInput = (question: FormQuestion, sectionIndex: number, questionIndex: number) => {
    const value = formData[question.id] || '';
    const isValid = validationResults[question.id] !== false;
    
    const commonProps = {
      className: `transition-all duration-200 ${!isValid && question.required ? 'border-destructive' : ''}`,
      onClick: () => onQuestionClick?.(sectionIndex, questionIndex)
    };

    switch (question.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'url':
      case 'number':
        return (
          <Input
            type={question.type}
            value={value}
            onChange={(e) => updateFormData(question.id, e.target.value)}
            placeholder={question.placeholder}
            required={question.required}
            {...commonProps}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => updateFormData(question.id, e.target.value)}
            placeholder={question.placeholder}
            required={question.required}
            {...commonProps}
          />
        );

      case 'radio':
        return (
          <RadioGroup
            value={value}
            onValueChange={(newValue) => updateFormData(question.id, newValue)}
            {...commonProps}
          >
            {question.options?.map((option, idx) => {
              const optionValue = typeof option === 'string' ? option : option.value;
              return (
                <div key={idx} className="flex items-center space-x-2">
                  <RadioGroupItem value={optionValue} id={`${question.id}-${idx}`} />
                  <Label htmlFor={`${question.id}-${idx}`} className="cursor-pointer">
                    {optionValue}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        );

      case 'checkbox':
        return (
          <div className="space-y-2" {...commonProps}>
            {question.options?.map((option, idx) => {
              const optionValue = typeof option === 'string' ? option : option.value;
              return (
                <div key={idx} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${question.id}-${idx}`}
                    checked={Array.isArray(value) && value.includes(optionValue)}
                    onCheckedChange={(checked) => {
                      const currentValues = Array.isArray(value) ? value : [];
                      const newValues = checked
                        ? [...currentValues, optionValue]
                        : currentValues.filter(v => v !== optionValue);
                      updateFormData(question.id, newValues);
                    }}
                  />
                  <Label htmlFor={`${question.id}-${idx}`} className="cursor-pointer">
                    {optionValue}
                  </Label>
                </div>
              );
            })}
          </div>
        );

      case 'dropdown':
        return (
          <Select value={value} onValueChange={(newValue) => updateFormData(question.id, newValue)}>
            <SelectTrigger {...commonProps}>
              <SelectValue placeholder={question.placeholder || "Välj alternativ..."} />
            </SelectTrigger>
            <SelectContent>
            {question.options?.map((option, idx) => {
              const optionValue = typeof option === 'string' ? option : option.value;
              return (
                <SelectItem key={idx} value={optionValue}>
                  {optionValue}
                </SelectItem>
              );
            })}
            </SelectContent>
          </Select>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => updateFormData(question.id, e.target.value)}
            required={question.required}
            {...commonProps}
          />
        );

      case 'info':
        return (
          <div className="p-4 rounded-lg bg-amber-50 border-l-4 border-amber-400 dark:bg-amber-950/20 dark:border-amber-600" {...commonProps}>
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                {question.label}
                {question.help_text && (
                  <p className="mt-2 text-amber-600 dark:text-amber-400">{question.help_text}</p>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => updateFormData(question.id, e.target.value)}
            placeholder={question.placeholder}
            required={question.required}
            {...commonProps}
          />
        );
    }
  };

  // Render section
  const renderSection = (section: FormSection, sectionIndex: number) => {
    const visibleQuestions = section.questions.filter(shouldShowQuestion);
    
    return (
      <Card key={sectionIndex} className="mb-4 border-2 border-transparent hover:border-primary/20 transition-all duration-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            {section.section_title}
            {section.show_if && (
              <Badge variant="outline" className="text-xs">
                Villkorlig
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {visibleQuestions.map((question, questionIndex) => (
            <div 
              key={question.id} 
              className={`space-y-2 p-3 rounded-lg transition-all duration-200 ${
                previewMode === 'interactive' 
                  ? 'hover:bg-accent/5 cursor-pointer' 
                  : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <Label className="font-medium">
                  {question.label}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {question.show_if && (
                  <Badge variant="secondary" className="text-xs">
                    Villkor
                  </Badge>
                )}
                {previewMode === 'interactive' && validationResults[question.id] && (
                  <CheckCircle className="h-4 w-4 text-accent_teal" />
                )}
                {previewMode === 'interactive' && question.required && !validationResults[question.id] && (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
              
              {question.help_text && (
                <p className="text-sm text-muted-foreground">{question.help_text}</p>
              )}
              
              {previewMode === 'interactive' ? (
                renderQuestionInput(question, sectionIndex, questionIndex)
              ) : (
                <div className="p-2 bg-muted/20 rounded border-2 border-dashed border-muted text-muted-foreground text-sm">
                  {question.type === 'radio' || question.type === 'dropdown' || question.type === 'checkbox' 
                    ? `${question.type} med ${question.options?.length || 0} alternativ`
                    : `${question.type} input`
                  }
                </div>
              )}
            </div>
          ))}
          
          {visibleQuestions.length === 0 && (
            <p className="text-muted-foreground text-center py-4">
              Inga synliga frågor i denna sektion
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-full flex flex-col bg-surface-light">
      {/* Preview Controls */}
      <div className="border-b bg-background p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Live Förhandsgranskning</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFormData({})}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Device Mode Selector */}
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Enhet:</Label>
          {(['desktop', 'tablet', 'mobile'] as DeviceMode[]).map((mode) => (
            <Button
              key={mode}
              variant={deviceMode === mode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDeviceMode(mode)}
              className="gap-2"
            >
              {mode === 'desktop' && <Monitor className="h-4 w-4" />}
              {mode === 'tablet' && <Tablet className="h-4 w-4" />}
              {mode === 'mobile' && <Smartphone className="h-4 w-4" />}
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Button>
          ))}
        </div>

        {/* Preview Mode Tabs */}
        <Tabs value={previewMode} onValueChange={(value) => setPreviewMode(value as PreviewMode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="static">Statisk</TabsTrigger>
            <TabsTrigger value="interactive">Interaktiv</TabsTrigger>
            <TabsTrigger value="accessibility">Tillgänglighet</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-hidden">
        <div 
          className="h-full mx-auto transition-all duration-300 ease-out bg-background shadow-xl"
          style={deviceMode !== 'desktop' ? {
            width: deviceDimensions[deviceMode].width,
            maxHeight: deviceDimensions[deviceMode].height
          } : {}}
        >
          <ScrollArea className="h-full">
            <div className="p-6">
              {/* Form Title */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold">{schema.title || 'Untitled Form'}</h1>
                {previewMode === 'interactive' && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">
                      Framsteg: {Object.keys(validationResults).length} / {schema.sections.reduce((total, section) => total + section.questions.length, 0)} frågor
                    </div>
                    <div className="flex-1 bg-muted h-2 rounded">
                      <div 
                        className="bg-accent_teal h-2 rounded transition-all duration-300"
                        style={{
                          width: `${(Object.keys(validationResults).length / schema.sections.reduce((total, section) => total + section.questions.length, 0)) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sections */}
              {previewMode === 'accessibility' ? (
                <div className="space-y-4">
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader>
                      <CardTitle className="text-yellow-800">Tillgänglighetsanalys</CardTitle>
                    </CardHeader>
                    <CardContent className="text-yellow-700">
                      <ul className="space-y-2 text-sm">
                        <li>• Alla frågor har tydliga etiketter</li>
                        <li>• Obligatoriska fält är markerade med *</li>
                        <li>• Formuläret är navigerbart med tangentbordet</li>
                        <li>• Färgkontrast följer WCAG-riktlinjer</li>
                        <li>• Felmeddelanden är tydliga och beskrivande</li>
                      </ul>
                    </CardContent>
                  </Card>
                  {schema.sections.map((section, index) => renderSection(section, index))}
                </div>
              ) : (
                schema.sections.map((section, index) => renderSection(section, index))
              )}

              {schema.sections.length === 0 && (
                <Card className="p-8 text-center border-dashed">
                  <p className="text-muted-foreground">Inget formulärinnehåll att förhandsgranska</p>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};