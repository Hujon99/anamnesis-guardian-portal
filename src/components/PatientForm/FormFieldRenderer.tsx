
/**
 * This component renders a form field based on its type.
 * It supports various input types like text, radio, dropdown, and number.
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

  const renderField = () => {
    switch (question.type) {
      case "text":
        return (
          <FormField
            control={control}
            name={question.id}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{question.label}{question.required && <span className="text-destructive ml-1">*</span>}</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Skriv ditt svar här..." 
                    {...field} 
                    rows={3}
                  />
                </FormControl>
                <FormDescription>
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
            name={question.id}
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>{question.label}{question.required && <span className="text-destructive ml-1">*</span>}</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    {question.options?.map(option => (
                      <FormItem key={option} className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value={option} />
                        </FormControl>
                        <FormLabel className="font-normal">{option}</FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
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
                <FormLabel>{question.label}{question.required && <span className="text-destructive ml-1">*</span>}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj ett alternativ" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {question.options?.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
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
            name={question.id}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{question.label}{question.required && <span className="text-destructive ml-1">*</span>}</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    {...field} 
                    onChange={e => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
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
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    {question.label}{question.required && <span className="text-destructive ml-1">*</span>}
                  </FormLabel>
                </div>
                <FormMessage />
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
                <FormLabel>{question.label}{question.required && <span className="text-destructive ml-1">*</span>}</FormLabel>
                <FormControl>
                  <Input {...field} />
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
