/**
 * This component renders a form field based on its type.
 * It supports various input types like text, radio, dropdown, checkbox, and number.
 * Enhanced with accessibility attributes for better screen reader support.
 * Now supports dynamic follow-up questions and the new option structure.
 */

import React, { useEffect } from "react";
import { FormQuestion, FormQuestionOption, DynamicFollowupQuestion } from "@/types/anamnesis";
import { 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage, 
  FormDescription 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useFormContext } from "react-hook-form";
import { FieldError } from "react-hook-form";

// Update interface to include the error prop that's being passed from FormSection
export interface FormFieldRendererProps {
  question: FormQuestion | DynamicFollowupQuestion;
  error: FieldError | any; // Add this line to include error in the props interface
  isOpticianField?: boolean;
}

export const FormFieldRenderer: React.FC<FormFieldRendererProps> = ({
  question,
  error,
  isOpticianField = false
}) => {
  const { control, watch, setValue } = useFormContext();
  const hasError = error !== undefined;
  
  // Log error information for debugging
  useEffect(() => {
    if (hasError) {
      const fieldId = (question as DynamicFollowupQuestion).runtimeId || question.id;
      console.log(`[FormFieldRenderer] Rendering field with error: ${fieldId}`, error);
    }
  }, [hasError, question, error]);
  
  const fieldId = `field-${(question as DynamicFollowupQuestion).runtimeId || question.id}`;
  const descriptionId = `desc-${(question as DynamicFollowupQuestion).runtimeId || question.id}`;
  const errorId = `error-${(question as DynamicFollowupQuestion).runtimeId || question.id}`;
  
  const fieldName = (question as DynamicFollowupQuestion).runtimeId || question.id;
  
  // Watch the current value for this field
  const fieldValue = watch(fieldName);
  
  // Extract value from nested object structure
  const extractValue = (val: any): any => {
    if (val && typeof val === 'object') {
      // Handle answer object with nested value structure
      if ('answer' in val && typeof val.answer === 'object') {
        return extractValue(val.answer);
      }
      // Handle direct value property
      if ('value' in val) {
        return val.value;
      }
    }
    return val;
  };

  // Handle special formatting for dynamic follow-up questions with nested values
  useEffect(() => {
    if (fieldValue && typeof fieldValue === 'object') {
      const extractedValue = extractValue(fieldValue);
      if (extractedValue !== fieldValue) {
        setValue(fieldName, extractedValue);
        console.log(`Extracted value ${extractedValue} for field ${fieldName}`);
      }
    }
  }, [fieldValue, fieldName, setValue]);
  
  const getOptionValue = (option: FormQuestionOption): string => {
    return typeof option === 'string' ? option : option.value;
  };
  
  const getOptionLabel = (option: FormQuestionOption): string => {
    return typeof option === 'string' ? option : option.value;
  };

  const isDynamicQuestion = 'runtimeId' in question;

  const dynamicQuestionClass = isDynamicQuestion 
    ? "pl-6 border-l-2 border-primary-100 mt-4 mb-2" 
    : "";

  const renderFollowUpHeading = () => {
    if (isDynamicQuestion && (question as DynamicFollowupQuestion).parentValue) {
      return (
        <h4 className="text-sm font-medium text-muted-foreground mb-2">
          Gällande: {(question as DynamicFollowupQuestion).parentValue}
        </h4>
      );
    }
    return null;
  };
  
  const renderField = () => {
    switch (question.type) {
      case "text":
        return (
          <FormField
            control={control}
            name={fieldName}
            render={({ field }) => (
              <FormItem className={dynamicQuestionClass}>
                {renderFollowUpHeading()}
                <FormLabel htmlFor={fieldId} className={isOpticianField ? "text-primary font-medium" : ""}>
                  {question.label}
                  {question.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
                  {question.required && <span className="sr-only">(Obligatoriskt)</span>}
                  {isOpticianField && <span className="text-sm ml-2 text-muted-foreground">(Endast för optiker)</span>}
                </FormLabel>
                <FormControl>
                  <Textarea 
                    id={fieldId}
                    placeholder={isOpticianField ? "Anteckningar från optiker..." : "Skriv ditt svar här..."} 
                    {...field} 
                    rows={3}
                    aria-required={question.required}
                    aria-invalid={hasError}
                    aria-describedby={`${descriptionId} ${hasError ? errorId : ''}`}
                    className={`${isOpticianField ? "border-primary/30 focus-visible:ring-primary" : ""} ${hasError ? "border-destructive" : ""}`}
                  />
                </FormControl>
                <FormDescription id={descriptionId}>
                  {isOpticianField 
                    ? "Anteckningar visas endast för optiker."
                    : "Var så detaljerad som möjligt i ditt svar."
                  }
                </FormDescription>
                <FormMessage id={errorId} />
              </FormItem>
            )}
          />
        );
        
      case "radio":
        return (
          <FormField
            control={control}
            name={fieldName}
            render={({ field }) => (
              <FormItem className={`space-y-3 ${dynamicQuestionClass}`}>
                {renderFollowUpHeading()}
                <FormLabel id={`label-${fieldId}`} className={isOpticianField ? "text-primary font-medium" : ""}>
                  {question.label}
                  {question.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
                  {question.required && <span className="sr-only">(Obligatoriskt)</span>}
                  {isOpticianField && <span className="text-sm ml-2 text-muted-foreground">(Endast för optiker)</span>}
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                    aria-labelledby={`label-${fieldId}`}
                    aria-required={question.required}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? errorId : undefined}
                  >
                    {question.options?.map(option => {
                      const optionValue = getOptionValue(option);
                      const optionLabel = getOptionLabel(option);
                      const optionId = `${fieldId}-${optionValue.replace(/\s+/g, '-').toLowerCase()}`;
                      return (
                        <FormItem key={optionValue} className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem 
                              value={optionValue} 
                              id={optionId}
                              className={isOpticianField ? "text-primary border-primary" : ""}
                            />
                          </FormControl>
                          <FormLabel className="font-normal" htmlFor={optionId}>{optionLabel}</FormLabel>
                        </FormItem>
                      );
                    })}
                  </RadioGroup>
                </FormControl>
                <FormMessage id={errorId} />
              </FormItem>
            )}
          />
        );
        
      case "checkbox":
        if (question.options && question.options.length > 0) {
          return (
            <FormField
              control={control}
              name={fieldName}
              render={({ field }) => {
                const values = Array.isArray(field.value) ? field.value : 
                  field.value ? [field.value] : [];
                
                return (
                  <FormItem className={`space-y-3 ${dynamicQuestionClass}`}>
                    {renderFollowUpHeading()}
                    <FormLabel className={isOpticianField ? "text-primary font-medium" : ""}>
                      {question.label}
                      {question.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
                      {question.required && <span className="sr-only">(Obligatoriskt)</span>}
                      {isOpticianField && <span className="text-sm ml-2 text-muted-foreground">(Endast för optiker)</span>}
                    </FormLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {question.options.map(option => {
                        const optionValue = getOptionValue(option);
                        const optionLabel = getOptionLabel(option);
                        const optionId = `${fieldId}-${optionValue.replace(/\s+/g, '-').toLowerCase()}`;
                        
                        const isChecked = values.includes(optionValue);
                        
                        return (
                          <FormField
                            key={optionValue}
                            control={control}
                            name={fieldName}
                            render={() => (
                              <FormItem 
                                key={optionId} 
                                className="flex items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    id={optionId}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      const newValues = checked 
                                        ? [...values, optionValue] 
                                        : values.filter(val => val !== optionValue);
                                      field.onChange(newValues.length ? newValues : undefined);
                                    }}
                                    className={isOpticianField ? "border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" : ""}
                                  />
                                </FormControl>
                                <FormLabel 
                                  htmlFor={optionId} 
                                  className="font-normal pt-0.5"
                                >
                                  {optionLabel}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        );
                      })}
                    </div>
                    <FormMessage id={errorId} />
                  </FormItem>
                );
              }}
            />
          );
        } else {
          return (
            <FormField
              control={control}
              name={fieldName}
              render={({ field }) => (
                <FormItem className={`flex flex-row items-start space-x-3 space-y-0 ${dynamicQuestionClass}`}>
                  {renderFollowUpHeading()}
                  <FormControl>
                    <Checkbox
                      id={fieldId}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-required={question.required}
                      aria-invalid={hasError}
                      aria-describedby={`${fieldId}-label ${hasError ? errorId : ''}`}
                      className={isOpticianField ? "border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" : ""}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel id={`${fieldId}-label`} htmlFor={fieldId} className={isOpticianField ? "text-primary font-medium" : ""}>
                      {question.label}
                      {question.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
                      {question.required && <span className="sr-only">(Obligatoriskt)</span>}
                      {isOpticianField && <span className="text-sm ml-2 text-muted-foreground">(Endast för optiker)</span>}
                    </FormLabel>
                  </div>
                  <FormMessage id={errorId} />
                </FormItem>
              )}
            />
          );
        }
        
      case "dropdown":
        return (
          <FormField
            control={control}
            name={fieldName}
            render={({ field }) => (
              <FormItem className={dynamicQuestionClass}>
                {renderFollowUpHeading()}
                <FormLabel htmlFor={fieldId} className={isOpticianField ? "text-primary font-medium" : ""}>
                  {question.label}
                  {question.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
                  {question.required && <span className="sr-only">(Obligatoriskt)</span>}
                  {isOpticianField && <span className="text-sm ml-2 text-muted-foreground">(Endast för optiker)</span>}
                </FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  name={fieldName}
                >
                  <FormControl>
                    <SelectTrigger
                      id={fieldId}
                      aria-required={question.required}
                      aria-invalid={hasError}
                      aria-describedby={hasError ? errorId : undefined}
                      className={isOpticianField ? "border-primary/30" : ""}
                    >
                      <SelectValue placeholder="Välj ett alternativ" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {question.options?.map(option => {
                      const optionValue = getOptionValue(option);
                      const optionLabel = getOptionLabel(option);
                      return (
                        <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage id={errorId} />
              </FormItem>
            )}
          />
        );
        
      case "number":
        return (
          <FormField
            control={control}
            name={fieldName}
            render={({ field }) => (
              <FormItem className={dynamicQuestionClass}>
                {renderFollowUpHeading()}
                <FormLabel htmlFor={fieldId} className={isOpticianField ? "text-primary font-medium" : ""}>
                  {question.label}
                  {question.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
                  {question.required && <span className="sr-only">(Obligatoriskt)</span>}
                  {isOpticianField && <span className="text-sm ml-2 text-muted-foreground">(Endast för optiker)</span>}
                </FormLabel>
                <FormControl>
                  <Input 
                    id={fieldId}
                    type="number" 
                    placeholder="0" 
                    {...field} 
                    onChange={e => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                    aria-required={question.required}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? errorId : undefined}
                    className={isOpticianField ? "border-primary/30" : ""}
                  />
                </FormControl>
                <FormMessage id={errorId} />
              </FormItem>
            )}
          />
        );
        
      default:
        return (
          <FormField
            control={control}
            name={fieldName}
            render={({ field }) => (
              <FormItem className={dynamicQuestionClass}>
                {renderFollowUpHeading()}
                <FormLabel htmlFor={fieldId} className={isOpticianField ? "text-primary font-medium" : ""}>
                  {question.label}
                  {question.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
                  {question.required && <span className="sr-only">(Obligatoriskt)</span>}
                  {isOpticianField && <span className="text-sm ml-2 text-muted-foreground">(Endast för optiker)</span>}
                </FormLabel>
                <FormControl>
                  <Input 
                    id={fieldId}
                    {...field}
                    aria-required={question.required}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? errorId : undefined}
                    className={isOpticianField ? "border-primary/30" : ""}
                  />
                </FormControl>
                <FormMessage id={errorId} />
              </FormItem>
            )}
          />
        );
    }
  };

  return renderField();
};
