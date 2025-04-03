
/**
 * This component renders a form field based on its type.
 * It supports various input types like text, radio, dropdown, and number.
 * Enhanced with accessibility attributes for better screen reader support.
 */

import React from "react";
import { FormQuestion } from "@/types/anamnesis";
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
  question: FormQuestion;
  error: any;
}

export const FormFieldRenderer: React.FC<FormFieldRendererProps> = ({
  question,
  error
}) => {
  const { control } = useFormContext();
  const hasError = error !== undefined;
  const fieldId = `field-${question.id}`;
  const descriptionId = `desc-${question.id}`;
  const errorId = `error-${question.id}`;

  const renderField = () => {
    switch (question.type) {
      case "text":
        return (
          <FormField
            control={control}
            name={question.id}
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor={fieldId}>
                  {question.label}
                  {question.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
                  {question.required && <span className="sr-only">(Obligatoriskt)</span>}
                </FormLabel>
                <FormControl>
                  <Textarea 
                    id={fieldId}
                    placeholder="Skriv ditt svar här..." 
                    {...field} 
                    rows={3}
                    aria-required={question.required}
                    aria-invalid={hasError}
                    aria-describedby={`${descriptionId} ${hasError ? errorId : ''}`}
                  />
                </FormControl>
                <FormDescription id={descriptionId}>
                  Var så detaljerad som möjligt i ditt svar.
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
            name={question.id}
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel id={`label-${question.id}`}>
                  {question.label}
                  {question.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
                  {question.required && <span className="sr-only">(Obligatoriskt)</span>}
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                    aria-labelledby={`label-${question.id}`}
                    aria-required={question.required}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? errorId : undefined}
                  >
                    {question.options?.map(option => {
                      const optionId = `${question.id}-${option.replace(/\s+/g, '-').toLowerCase()}`;
                      return (
                        <FormItem key={option} className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={option} id={optionId} />
                          </FormControl>
                          <FormLabel className="font-normal" htmlFor={optionId}>{option}</FormLabel>
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
        
      case "dropdown":
        return (
          <FormField
            control={control}
            name={question.id}
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor={fieldId}>
                  {question.label}
                  {question.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
                  {question.required && <span className="sr-only">(Obligatoriskt)</span>}
                </FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  name={question.id}
                >
                  <FormControl>
                    <SelectTrigger
                      id={fieldId}
                      aria-required={question.required}
                      aria-invalid={hasError}
                      aria-describedby={hasError ? errorId : undefined}
                    >
                      <SelectValue placeholder="Välj ett alternativ" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {question.options?.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
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
            name={question.id}
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor={fieldId}>
                  {question.label}
                  {question.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
                  {question.required && <span className="sr-only">(Obligatoriskt)</span>}
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
                  />
                </FormControl>
                <FormMessage id={errorId} />
              </FormItem>
            )}
          />
        );
        
      case "checkbox":
        return (
          <FormField
            control={control}
            name={question.id}
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    id={fieldId}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-required={question.required}
                    aria-invalid={hasError}
                    aria-describedby={`${fieldId}-label ${hasError ? errorId : ''}`}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel id={`${fieldId}-label`} htmlFor={fieldId}>
                    {question.label}
                    {question.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
                    {question.required && <span className="sr-only">(Obligatoriskt)</span>}
                  </FormLabel>
                </div>
                <FormMessage id={errorId} />
              </FormItem>
            )}
          />
        );
        
      default:
        return (
          <FormField
            control={control}
            name={question.id}
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor={fieldId}>
                  {question.label}
                  {question.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
                  {question.required && <span className="sr-only">(Obligatoriskt)</span>}
                </FormLabel>
                <FormControl>
                  <Input 
                    id={fieldId}
                    {...field}
                    aria-required={question.required}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? errorId : undefined}
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
