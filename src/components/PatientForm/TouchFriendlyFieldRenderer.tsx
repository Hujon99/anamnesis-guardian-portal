/**
 * This component renders form fields optimized for touch interfaces.
 * It provides larger, more accessible inputs for mobile and iPad users,
 * with enhanced spacing and visual feedback.
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
import { FieldError } from "react-hook-form";

interface TouchFriendlyFieldRendererProps {
  question: FormQuestion | DynamicFollowupQuestion;
  error: FieldError | any;
}

export const TouchFriendlyFieldRenderer: React.FC<TouchFriendlyFieldRendererProps> = ({
  question,
  error
}) => {
  const { control, watch, setValue } = useFormContext();
  const hasError = error !== undefined;
  
  const fieldName = (question as DynamicFollowupQuestion).runtimeId || question.id;
  const fieldValue = watch(fieldName);
  
  // Only extract values if they are complex nested objects from initial values
  const extractValue = (val: any): any => {
    if (val === null || val === undefined) return val;
    
    // Only extract from complex objects that have nested structure
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if ('answer' in val && typeof val.answer === 'object') {
        if ('value' in val.answer) return val.answer.value;
        return val.answer;
      }
      if ('value' in val && Object.keys(val).length === 1) return val.value;
    }
    
    return val;
  };


  // Initialize field with proper default value only on mount
  React.useEffect(() => {
    const currentValue = watch(fieldName);
    
    // Only set default for empty fields on initial mount
    // Don't clear existing values - let conditional logic handle visibility
    if (currentValue === undefined || currentValue === null || currentValue === "") {
      if (question.type === "checkbox" && question.options && question.options.length > 0) {
        setValue(fieldName, [], { shouldValidate: false, shouldDirty: false });
      }
    }
  }, []); // Empty deps - only run on initial mount
  
  const getOptionValue = (option: FormQuestionOption): string => {
    return typeof option === 'string' ? option : option.value;
  };
  
  const getOptionLabel = (option: FormQuestionOption): string => {
    return typeof option === 'string' ? option : option.value;
  };

  const isDynamicQuestion = 'runtimeId' in question;

  const renderFollowUpHeading = () => {
    if (isDynamicQuestion && (question as DynamicFollowupQuestion).parentValue) {
      return (
        <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm font-medium text-primary">
            Gällande: {(question as DynamicFollowupQuestion).parentValue}
          </p>
        </div>
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
              <FormItem className="space-y-4">
                {renderFollowUpHeading()}
                <FormLabel className="text-lg font-semibold text-foreground leading-relaxed break-words">
                  {question.label}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Skriv ditt svar här..." 
                    {...field} 
                    rows={4}
                    className="text-base p-4 min-h-[120px] rounded-xl border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  />
                </FormControl>
                <FormDescription className="text-muted-foreground">
                  Var så detaljerad som möjligt i ditt svar.
                </FormDescription>
                <FormMessage />
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
              <FormItem className="space-y-6">
                {renderFollowUpHeading()}
                <FormLabel className="text-lg font-semibold text-foreground leading-relaxed break-words">
                  {question.label}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                 <FormControl>
                   <RadioGroup
                     onValueChange={field.onChange}
                     value={field.value || ""}
                     className="space-y-3"
                   >
                    {question.options?.map(option => {
                      const optionValue = getOptionValue(option);
                      const optionLabel = getOptionLabel(option);
                      return (
                        <label 
                          key={optionValue}
                          htmlFor={`${fieldName}-${optionValue}`}
                          className="flex items-center space-x-4 p-4 rounded-xl border-2 border-border hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all group"
                        >
                          <RadioGroupItem 
                            value={optionValue} 
                            id={`${fieldName}-${optionValue}`}
                            className="w-6 h-6 border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <span className="text-base font-medium leading-relaxed flex-1 select-none break-words">
                            {optionLabel}
                          </span>
                        </label>
                      );
                    })}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
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
                  <FormItem className="space-y-6">
                    {renderFollowUpHeading()}
                    <FormLabel className="text-lg font-semibold text-foreground leading-relaxed break-words">
                      {question.label}
                      {question.required && <span className="text-destructive ml-1">*</span>}
                    </FormLabel>
                    <div className="space-y-3">
                      {question.options.map(option => {
                        const optionValue = getOptionValue(option);
                        const optionLabel = getOptionLabel(option);
                        const isChecked = values.includes(optionValue);
                        
                        return (
                          <FormField
                            key={optionValue}
                            control={control}
                            name={fieldName}
                            render={() => (
                              <FormItem className="flex items-center space-x-4 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      const newValues = checked 
                                        ? [...values, optionValue] 
                                        : values.filter(val => val !== optionValue);
                                      field.onChange(newValues.length ? newValues : undefined);
                                    }}
                                    className="w-6 h-6 border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  />
                                </FormControl>
                                <FormLabel className="text-base font-medium leading-relaxed flex-1 cursor-pointer p-4 rounded-xl border-2 border-border hover:border-primary/30 hover:bg-primary/5 transition-all break-words">
                                  {optionLabel}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        );
                      })}
                    </div>
                    <FormMessage />
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
                <FormItem className="space-y-4">
                  {renderFollowUpHeading()}
                  <div className="flex items-center space-x-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="w-6 h-6 border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </FormControl>
                    <FormLabel className="text-lg font-semibold text-foreground leading-relaxed cursor-pointer break-words">
                      {question.label}
                      {question.required && <span className="text-destructive ml-1">*</span>}
                    </FormLabel>
                  </div>
                  <FormMessage />
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
              <FormItem className="space-y-4">
                {renderFollowUpHeading()}
                <FormLabel className="text-lg font-semibold text-foreground leading-relaxed break-words">
                  {question.label}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                 <Select 
                   onValueChange={field.onChange} 
                   value={field.value || ""}
                   name={fieldName}
                 >
                  <FormControl>
                    <SelectTrigger className="h-14 text-base px-4 rounded-xl border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Välj ett alternativ" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-xl border-2">
                    {question.options?.map(option => {
                      const optionValue = getOptionValue(option);
                      const optionLabel = getOptionLabel(option);
                      return (
                        <SelectItem 
                          key={optionValue} 
                          value={optionValue}
                          className="text-base py-3 px-4 focus:bg-primary/10 focus:text-primary"
                        >
                          {optionLabel}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
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
              <FormItem className="space-y-4">
                {renderFollowUpHeading()}
                <FormLabel className="text-lg font-semibold text-foreground leading-relaxed break-words">
                  {question.label}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    {...field} 
                    onChange={e => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                    className="h-14 text-base px-4 rounded-xl border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  />
                </FormControl>
                <FormMessage />
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
              <FormItem className="space-y-4">
                {renderFollowUpHeading()}
                <FormLabel className="text-lg font-semibold text-foreground leading-relaxed break-words">
                  {question.label}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input 
                    {...field}
                    className="h-14 text-base px-4 rounded-xl border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
    }
  };

  return renderField();
};