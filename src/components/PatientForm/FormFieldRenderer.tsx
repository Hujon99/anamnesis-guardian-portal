/**
 * This component renders form fields based on their type.
 * It supports various input types and handles dynamic follow-up questions
 * with proper value extraction and nested data structures.
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

export interface FormFieldRendererProps {
  question: FormQuestion | DynamicFollowupQuestion;
  error: FieldError | any;
  isOpticianField?: boolean;
}

export const FormFieldRenderer: React.FC<FormFieldRendererProps> = ({
  question,
  error,
  isOpticianField = false
}) => {
  const { control, watch, setValue } = useFormContext();
  const hasError = error !== undefined;
  
  
  const fieldId = `field-${(question as DynamicFollowupQuestion).runtimeId || question.id}`;
  const descriptionId = `desc-${(question as DynamicFollowupQuestion).runtimeId || question.id}`;
  const errorId = `error-${(question as DynamicFollowupQuestion).runtimeId || question.id}`;
  
  const fieldName = (question as DynamicFollowupQuestion).runtimeId || question.id;
  
  const fieldValue = watch(fieldName);
  
  const extractValue = (val: any): any => {
    if (val === null || val === undefined) {
      return val;
    }
    
    if (val && typeof val === 'object') {
      if ('answer' in val && typeof val.answer === 'object') {
        if ('value' in val.answer) {
          return val.answer.value;
        }
        return val.answer;
      }
      
      if ('value' in val) {
        return val.value;
      }
      
      if ('parent_question' in val && 'parent_value' in val && 'value' in val) {
        return val.value;
      }
    }
    
    return val;
  };

  useEffect(() => {
    if (fieldValue) {
      const extractedValue = extractValue(fieldValue);
      
      if (extractedValue !== fieldValue && extractedValue !== undefined) {
        setValue(fieldName, extractedValue);
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
