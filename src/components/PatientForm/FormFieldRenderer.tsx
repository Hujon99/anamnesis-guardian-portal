
/**
 * This component renders a form field based on its type.
 * It supports various input types like text, radio, dropdown, checkbox, and number.
 * Enhanced with accessibility attributes for better screen reader support.
 * Now supports dynamic follow-up questions and the new option structure.
 */

import React from "react";
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

interface FormFieldRendererProps {
  question: FormQuestion | DynamicFollowupQuestion;
  error: any;
  isOpticianField?: boolean;
}

export const FormFieldRenderer: React.FC<FormFieldRendererProps> = ({
  question,
  error,
  isOpticianField = false
}) => {
  const { control, watch } = useFormContext();
  const hasError = error !== undefined;
  
  // Use the runtime ID for dynamic questions, otherwise use the regular ID
  const fieldId = `field-${(question as DynamicFollowupQuestion).runtimeId || question.id}`;
  const descriptionId = `desc-${(question as DynamicFollowupQuestion).runtimeId || question.id}`;
  const errorId = `error-${(question as DynamicFollowupQuestion).runtimeId || question.id}`;
  
  // Get the field name to use in the form (runtime ID or regular ID)
  const fieldName = (question as DynamicFollowupQuestion).runtimeId || question.id;
  
  // Helper function to get the displayed value from an option
  const getOptionValue = (option: FormQuestionOption): string => {
    return typeof option === 'string' ? option : option.value;
  };
  
  // Helper function to get the display label from an option
  const getOptionLabel = (option: FormQuestionOption): string => {
    return typeof option === 'string' ? option : option.value;
  };

  // Helper to determine if this is a dynamic follow-up question
  const isDynamicQuestion = 'runtimeId' in question;

  // Add a class for dynamic follow-up questions
  const dynamicQuestionClass = isDynamicQuestion 
    ? "pl-6 border-l-2 border-primary-100 mt-4 mb-2" 
    : "";

  const renderField = () => {
    switch (question.type) {
      case "text":
        return (
          <FormField
            control={control}
            name={fieldName}
            render={({ field }) => (
              <FormItem className={dynamicQuestionClass}>
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
                    className={isOpticianField ? "border-primary/30 focus-visible:ring-primary" : ""}
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
        // For checkbox type questions with multiple options (new in the updated template)
        if (question.options && question.options.length > 0) {
          return (
            <FormField
              control={control}
              name={fieldName}
              render={({ field }) => {
                // Ensure field.value is an array
                const values = Array.isArray(field.value) ? field.value : 
                  field.value ? [field.value] : [];
                
                return (
                  <FormItem className={`space-y-3 ${dynamicQuestionClass}`}>
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
                        
                        // Check if this option is in the selected values
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
                                      // Handle the checkbox change by updating the array of values
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
          // For single checkbox (Boolean type)
          return (
            <FormField
              control={control}
              name={fieldName}
              render={({ field }) => (
                <FormItem className={`flex flex-row items-start space-x-3 space-y-0 ${dynamicQuestionClass}`}>
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
