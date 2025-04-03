
/**
 * This component wraps the patient form, handling the state management,
 * validation, and submission logic. It provides dynamic form generation
 * based on a template with conditional sections and questions.
 */

import React, { useState, useEffect, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormTemplate } from "@/types/anamnesis";
import { FormSection } from "./FormSection";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { FileQuestion } from "lucide-react";

interface FormWrapperProps {
  formTemplate: FormTemplate;
  onSubmit: (values: any) => Promise<void>;
  isSubmitting: boolean;
}

export const FormWrapper: React.FC<FormWrapperProps> = ({
  formTemplate,
  onSubmit,
  isSubmitting
}) => {
  const [formStep, setFormStep] = useState(0);
  const [formSections, setFormSections] = useState<Array<Array<any>>>([]);
  const [sectionProgress, setSectionProgress] = useState(0);
  
  // Create a dynamic validation schema based on visible questions
  const createValidationSchema = (template: FormTemplate, values: Record<string, any>) => {
    const schemaMap: Record<string, any> = {};
    
    template.sections.forEach(section => {
      // Skip sections that are conditional and condition is not met
      if (section.show_if) {
        const { question, equals } = section.show_if;
        const dependentValue = values[question];
        
        let shouldShow = false;
        if (Array.isArray(equals)) {
          shouldShow = equals.includes(dependentValue);
        } else {
          shouldShow = dependentValue === equals;
        }
        
        if (!shouldShow) return;
      }
      
      section.questions.forEach(question => {
        // Skip questions that are conditional and condition is not met
        if (question.show_if) {
          const { question: dependentQuestionId, equals } = question.show_if;
          const dependentValue = values[dependentQuestionId];
          
          let shouldShow = false;
          if (Array.isArray(equals)) {
            shouldShow = equals.includes(dependentValue);
          } else {
            shouldShow = dependentValue === equals;
          }
          
          if (!shouldShow) return;
        }
        
        // Add validation rule based on question type and required flag
        if (question.required) {
          switch (question.type) {
            case "text":
              schemaMap[question.id] = z.string().min(1, { message: "Detta fält måste fyllas i" });
              break;
            case "number":
              schemaMap[question.id] = z.number().or(z.string().min(1, { message: "Detta fält måste fyllas i" }));
              break;
            case "radio":
            case "dropdown":
              schemaMap[question.id] = z.string().min(1, { message: "Du måste välja ett alternativ" });
              break;
            case "checkbox":
              schemaMap[question.id] = z.boolean().refine(val => val, { message: "Detta måste kryssas i" });
              break;
            default:
              schemaMap[question.id] = z.string().min(1, { message: "Detta fält måste fyllas i" });
          }
        } else {
          // Not required fields
          switch (question.type) {
            case "number":
              schemaMap[question.id] = z.number().or(z.string()).optional();
              break;
            case "checkbox":
              schemaMap[question.id] = z.boolean().optional();
              break;
            default:
              schemaMap[question.id] = z.string().optional();
          }
        }
      });
    });
    
    return z.object(schemaMap);
  };
  
  // Initialize form with default values for all possible questions
  const generateDefaultValues = (template: FormTemplate) => {
    const defaultValues: Record<string, any> = {};
    
    template.sections.forEach(section => {
      section.questions.forEach(question => {
        switch (question.type) {
          case "checkbox":
            defaultValues[question.id] = false;
            break;
          case "number":
            defaultValues[question.id] = "";
            break;
          default:
            defaultValues[question.id] = "";
        }
      });
    });
    
    return defaultValues;
  };
  
  const defaultValues = generateDefaultValues(formTemplate);
  const formValues = useForm();
  
  // Get the watched values for conditional display
  const watchedValues = formValues.watch();
  
  // Update the validation schema when form values change to handle conditional logic
  const validationSchema = useMemo(() => 
    createValidationSchema(formTemplate, watchedValues),
  [formTemplate, watchedValues]);
  
  // Create a new form instance when validation schema changes
  const form = useForm({
    defaultValues,
    resolver: zodResolver(validationSchema)
  });
  
  const { handleSubmit, formState, trigger, watch } = form;
  const currentValues = watch();
  
  // Group sections into logical steps (e.g., 1-2 sections per step)
  useEffect(() => {
    const visibleSections = formTemplate.sections.filter(section => {
      if (!section.show_if) return true;
      
      const { question, equals } = section.show_if;
      const dependentValue = currentValues[question];
      
      if (Array.isArray(equals)) {
        return equals.includes(dependentValue);
      }
      
      return dependentValue === equals;
    });
    
    // Simple approach: each section is its own step
    setFormSections(visibleSections.map(section => [section]));
  }, [formTemplate, currentValues]);
  
  // Handle next step logic
  const goToNextStep = async () => {
    // Get the current sections to validate
    const currentSections = formSections[formStep];
    
    // Collect all question IDs from the current step that are visible and required
    const fieldsToValidate: string[] = [];
    
    currentSections.forEach(section => {
      section.questions.forEach(question => {
        // Skip questions that shouldn't be shown
        if (question.show_if) {
          const { question: dependentQuestionId, equals } = question.show_if;
          const dependentValue = currentValues[dependentQuestionId];
          
          let shouldShow = false;
          if (Array.isArray(equals)) {
            shouldShow = equals.includes(dependentValue);
          } else {
            shouldShow = dependentValue === equals;
          }
          
          if (!shouldShow) return;
        }
        
        if (question.required) {
          fieldsToValidate.push(question.id);
        }
      });
    });
    
    // Validate only the fields in the current step
    const isValid = await trigger(fieldsToValidate);
    
    if (isValid) {
      if (formStep < formSections.length - 1) {
        setFormStep(prev => prev + 1);
        setSectionProgress(0); // Reset progress within the new section
        window.scrollTo(0, 0); // Scroll to top for new section
      } else {
        // This is the last step, submit the form
        handleSubmit(onSubmit)();
      }
    }
  };
  
  // Handle previous step logic
  const goToPreviousStep = () => {
    if (formStep > 0) {
      setFormStep(prev => prev - 1);
      setSectionProgress(100); // Set to 100% for previous section
      window.scrollTo(0, 0); // Scroll to top for new section
    }
  };
  
  const calculateProgress = () => {
    if (formSections.length === 0) return 0;
    const progress = ((formStep) / formSections.length) * 100;
    return Math.min(Math.round(progress), 100);
  };
  
  return (
    <FormProvider {...form}>
      <Card>
        <CardHeader>
          <div className="flex justify-center mb-4">
            <FileQuestion className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-center">
            {formTemplate.title}
          </CardTitle>
          <CardDescription className="text-center">
            Vänligen fyll i formuläret nedan för att hjälpa din optiker förbereda din undersökning.
          </CardDescription>
          
          {/* Progress bar */}
          <div className="w-full mt-4">
            <div className="flex justify-between mb-2">
              <span className="text-xs">Steg {formStep + 1} av {formSections.length}</span>
              <span className="text-xs">{calculateProgress()}% klart</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-in-out" 
                style={{ width: `${calculateProgress()}%` }}
              ></div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <form id="patient-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {formSections.length > 0 && formStep < formSections.length && (
              <div className="space-y-8">
                {formSections[formStep].map((section, idx) => (
                  <FormSection 
                    key={`${section.section_title}-${idx}`} 
                    section={section}
                    currentValues={currentValues}
                  />
                ))}
              </div>
            )}
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-4">
          <div className="flex justify-between w-full">
            {formStep > 0 && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={goToPreviousStep}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Föregående
              </Button>
            )}
            
            <Button 
              type="button" 
              onClick={goToNextStep}
              className={`${formStep === 0 && "ml-auto"}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : formStep < formSections.length - 1 ? (
                <>
                  Nästa
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                "Skicka svar"
              )}
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            All information behandlas konfidentiellt och används endast för din synundersökning.
          </p>
        </CardFooter>
      </Card>
    </FormProvider>
  );
};
