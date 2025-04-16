
/**
 * This component renders form fields based on their type.
 * It supports conditional rendering and displays validation errors.
 */

import React from "react";
import { useFormContext } from "react-hook-form";
import { FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FormQuestion, DynamicFollowupQuestion } from "@/types/anamnesis";

interface FormFieldRendererProps {
  question: FormQuestion | DynamicFollowupQuestion;
  currentValues?: Record<string, any>;
}

export const FormFieldRenderer: React.FC<FormFieldRendererProps> = ({
  question,
  currentValues = {}
}) => {
  const { control, formState } = useFormContext();
  const fieldId = (question as DynamicFollowupQuestion)?.runtimeId || question.id;
  const fieldErrors = formState.errors;
  const hasError = !!fieldErrors[fieldId];
  
  // Get the dynamic runtime ID if this is a follow-up question
  // This is needed to correctly associate the form controls with their corresponding form state
  const fieldName = fieldId;
  
  // Add asterisk to required fields
  const renderLabel = () => (
    <FormLabel htmlFor={fieldId} className={hasError ? "text-destructive" : ""}>
      {question.label}
      {question.required && <span className="text-destructive ml-1">*</span>}
    </FormLabel>
  );
  
  // Render the appropriate form control based on question type
  const renderFormControl = () => {
    switch (question.type) {
      case "text":
        return (
          <FormControl>
            <Input 
              id={fieldId} 
              type="text" 
              autoComplete="off"
              className={hasError ? "border-destructive" : ""}
              aria-invalid={hasError}
              aria-describedby={hasError ? `${fieldId}-error` : undefined}
            />
          </FormControl>
        );
      
      case "number":
        return (
          <FormControl>
            <Input 
              id={fieldId} 
              type="number" 
              inputMode="numeric" 
              className={hasError ? "border-destructive" : ""}
              aria-invalid={hasError}
              aria-describedby={hasError ? `${fieldId}-error` : undefined}
            />
          </FormControl>
        );
      
      case "checkbox":
        // Handle multi-select checkboxes (with options array)
        if (question.options && question.options.length > 0) {
          return (
            <div className={`space-y-2 ${hasError ? "has-error" : ""}`}>
              {question.options.map((option, index) => {
                // Handle options as strings or objects
                const optionValue = typeof option === "string" ? option : option.value;
                
                return (
                  <div key={`${fieldId}-${index}`} className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox 
                        id={`${fieldId}-${index}`}
                        value={optionValue}
                        className={hasError ? "border-destructive" : ""}
                      />
                    </FormControl>
                    <Label 
                      htmlFor={`${fieldId}-${index}`}
                      className={hasError ? "text-destructive" : ""}
                    >
                      {optionValue}
                    </Label>
                  </div>
                );
              })}
            </div>
          );
        }
        
        // Single checkbox for boolean values
        return (
          <div className="flex items-center space-x-2">
            <FormControl>
              <Checkbox 
                id={fieldId}
                className={hasError ? "border-destructive" : ""}
                aria-invalid={hasError}
                aria-describedby={hasError ? `${fieldId}-error` : undefined}
              />
            </FormControl>
            <Label 
              htmlFor={fieldId}
              className={hasError ? "text-destructive" : ""}
            >
              {question.label}
            </Label>
          </div>
        );
      
      case "radio":
        return (
          <FormControl>
            <RadioGroup id={fieldId}>
              {(question.options || []).map((option, index) => {
                // Handle options as strings or objects
                const optionValue = typeof option === "string" ? option : option.value;
                
                return (
                  <div key={`${fieldId}-${index}`} className="flex items-center space-x-2 mb-2">
                    <FormControl>
                      <RadioGroupItem 
                        value={optionValue} 
                        id={`${fieldId}-${index}`} 
                        className={hasError ? "border-destructive" : ""}
                      />
                    </FormControl>
                    <Label 
                      htmlFor={`${fieldId}-${index}`}
                      className={hasError ? "text-destructive" : ""}
                    >
                      {optionValue}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </FormControl>
        );
      
      case "dropdown":
        return (
          <FormControl>
            <select 
              id={fieldId} 
              className={`w-full p-2 border rounded-md ${hasError ? "border-destructive" : "border-input"}`}
              aria-invalid={hasError}
              aria-describedby={hasError ? `${fieldId}-error` : undefined}
            >
              <option value="">Välj ett alternativ</option>
              {(question.options || []).map((option, index) => {
                // Handle options as strings or objects
                const optionValue = typeof option === "string" ? option : option.value;
                
                return (
                  <option key={`${fieldId}-${index}`} value={optionValue}>
                    {optionValue}
                  </option>
                );
              })}
            </select>
          </FormControl>
        );
      
      default:
        return (
          <FormControl>
            <Input 
              id={fieldId} 
              type="text" 
              className={hasError ? "border-destructive" : ""}
              aria-invalid={hasError}
              aria-describedby={hasError ? `${fieldId}-error` : undefined}
            />
          </FormControl>
        );
    }
  };

  return (
    <FormItem className="mb-6">
      {/* Skip label for single checkboxes, it's rendered with the checkbox */}
      {question.type !== "checkbox" || (question.options && question.options.length > 0) ? renderLabel() : null}
      {renderFormControl()}
      <FormMessage id={`${fieldId}-error`} />
      
      {/* If a description is needed, it would go here */}
      {/* <FormDescription>...</FormDescription> */}
    </FormItem>
  );
};

export default FormFieldRenderer;
