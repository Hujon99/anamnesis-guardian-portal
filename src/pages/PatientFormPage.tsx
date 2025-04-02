
/**
 * This page renders the patient form based on a dynamic form template.
 * It handles token verification, form rendering, validation, and submission.
 * The form template is fetched from the anamnes_forms table via the verify-token
 * edge function to avoid RLS issues.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, FileQuestion, AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormQuestion, FormTemplate } from "@/hooks/useFormTemplate";
import { AnamnesForm } from "@/types/anamnesis";

// Import the Supabase anon key from the client
import { SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

const PatientFormPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [entryData, setEntryData] = useState<any>(null);
  const [formSchema, setFormSchema] = useState<FormTemplate | null>(null);
  const [formStep, setFormStep] = useState<number>(0);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formQuestions, setFormQuestions] = useState<FormQuestion[]>([]);
  const [retryCount, setRetryCount] = useState(0);

  // Dynamically create the form validation schema based on the form template
  const createDynamicSchema = (questions: FormQuestion[]) => {
    const schemaFields: Record<string, any> = {};
    
    questions.forEach(question => {
      // Skip questions that have conditions
      if (!question.show_if) {
        schemaFields[question.id] = z.string().min(1, { 
          message: `${question.label} måste besvaras` 
        });
      }
    });
    
    return z.object(schemaFields);
  };

  // Initialize form
  const [zodSchema, setZodSchema] = useState(z.object({}));
  const form = useForm<any>({
    resolver: zodResolver(zodSchema),
    defaultValues: {}
  });

  // Watch all form values to handle conditional questions
  const formValues = form.watch();
  
  // Update the visible questions based on form values
  useEffect(() => {
    if (formSchema?.questions) {
      const visibleQuestions = formSchema.questions.filter((question: FormQuestion) => {
        // If question has a condition, check if it should be visible
        if (question.show_if) {
          const conditionQuestion = question.show_if.question;
          const conditionValue = question.show_if.equals;
          return formValues[conditionQuestion] === conditionValue;
        }
        return true;
      });
      
      setFormQuestions(visibleQuestions);
      
      // Update validation schema for visible questions
      setZodSchema(createDynamicSchema(visibleQuestions));
    }
  }, [formSchema, formValues]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setDiagnosticInfo(null);
    setRetryCount(prev => prev + 1);
  };

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("Ingen token angiven. Kontrollera länken du fick.");
        setLoading(false);
        return;
      }

      try {
        console.log(`Verifying token (attempt ${retryCount + 1}): ${token.substring(0, 6)}...`);
        console.log(`Using Supabase function endpoint`);
        
        // Call the verify-token edge function with Authorization header
        const response = await supabase.functions.invoke('verify-token', {
          body: { token },
          headers: {
            Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
          }
        });

        console.log('Token verification response:', response);

        if (response.error) {
          console.error("Token verification failed:", response.error);
          
          // Collect diagnostic information
          let diagnostic = `Status: ${response.error?.status || 'Unknown'}\n`;
          diagnostic += `Message: ${response.error?.message || 'No message'}\n`;
          
          if (response.data) {
            diagnostic += `Data: ${JSON.stringify(response.data, null, 2)}\n`;
          }
          
          setDiagnosticInfo(diagnostic);
          
          // Handle different error cases based on error code
          if (response.data?.code === 'expired' || response.data?.status === 'expired') {
            setExpired(true);
          } else if (
            response.data?.code === 'already_submitted' || 
            response.data?.status === 'pending' || 
            response.data?.status === 'ready' || 
            response.data?.status === 'reviewed'
          ) {
            setSubmitted(true);
          } else {
            // Set both the error message and error code
            setError(response.error.message || response.data?.error || "Ogiltig eller utgången token.");
            setErrorCode(response.data?.code || "unknown_error");
          }
          
          setLoading(false);
          return;
        }

        if (response.data?.success) {
          // Get entry data from response
          const entryData = response.data.entry;
          console.log("Entry data received:", entryData);
          setEntryData(entryData);
          
          // Get form template data from response
          const formTemplateData = response.data.formTemplate;
          console.log("Form template received:", formTemplateData);
          
          if (formTemplateData) {
            // Type assertion to handle the schema property
            const typedFormData = formTemplateData as unknown as AnamnesForm;
            setFormSchema(typedFormData.schema);
            
            // Initialize form with default values
            const defaultValues: Record<string, string> = {};
            typedFormData.schema.questions.forEach((q: FormQuestion) => {
              defaultValues[q.id] = "";
            });
            
            form.reset(defaultValues);
          } else {
            console.error("No form template found in response");
            setError("Inget formulär hittades för denna organisation.");
          }
          
          // If this form has already been filled, show submitted state
          if (entryData.status === 'pending' || 
              entryData.status === 'ready' || 
              entryData.status === 'reviewed') {
            setSubmitted(true);
          }
        } else {
          console.error("Invalid response structure:", response);
          setError("Kunde inte verifiera åtkomst. Kontakta din optiker.");
        }

        setLoading(false);
      } catch (err) {
        console.error("Error verifying token:", err);
        setError("Ett tekniskt fel uppstod. Försök igen senare.");
        setDiagnosticInfo(`Technical error: ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    };

    verifyToken();
  }, [token, form, retryCount]);

  const nextStep = () => {
    // Get visible questions for current step
    const currentStepQuestions = getCurrentStepQuestions();
    
    // Check if all fields in current step are valid
    let isValid = true;
    
    currentStepQuestions.forEach(question => {
      const fieldState = form.getFieldState(question.id);
      
      if (!fieldState.isDirty) {
        form.setError(question.id, { message: 'Du måste fylla i detta fält' });
        isValid = false;
      } else if (fieldState.error) {
        isValid = false;
      }
    });
    
    if (!isValid) return;
    
    // Move to next step
    setFormStep(prev => prev + 1);
  };

  const prevStep = () => {
    setFormStep(prev => prev - 1);
  };

  // Get questions for current step
  const getCurrentStepQuestions = () => {
    if (!formQuestions.length) return [];
    
    const questionsPerStep = 1;
    const startIdx = formStep * questionsPerStep;
    return formQuestions.slice(startIdx, startIdx + questionsPerStep);
  };

  const onSubmit = async (values: any) => {
    if (!token) return;
    
    try {
      setSubmitLoading(true);
      const formMetadata = {
        submittedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`
      };
      
      const response = await supabase.functions.invoke('submit-form', {
        body: { 
          token,
          answers: values,
          formData: formMetadata
        },
        headers: {
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
        }
      });

      if (response.error) {
        if (response.error.message.includes('gått ut') || response.data?.status === 'expired') {
          setExpired(true);
        } else {
          setError(response.error.message || "Det gick inte att skicka formuläret.");
        }
        setSubmitLoading(false);
        return;
      }

      setSubmitted(true);
      setSubmitLoading(false);
    } catch (err) {
      console.error("Error submitting form:", err);
      setError("Ett tekniskt fel uppstod vid inskickning. Försök igen senare.");
      setSubmitLoading(false);
    }
  };

  function renderFormProgress() {
    if (!formQuestions.length) return null;
    
    const progress = (formStep + 1) / formQuestions.length;
    const percentage = Math.min(Math.round(progress * 100), 100);
    
    return (
      <div className="w-full mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-xs">Steg {formStep + 1} av {formQuestions.length}</span>
          <span className="text-xs">{percentage}% klart</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-in-out" 
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  }

  function renderFormField(question: FormQuestion) {
    switch (question.type) {
      case "text":
        return (
          <FormField
            key={question.id}
            control={form.control}
            name={question.id}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{question.label}</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder={`Skriv ditt svar här...`} 
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
            key={question.id}
            control={form.control}
            name={question.id}
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>{question.label}</FormLabel>
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
        
      default:
        return (
          <FormField
            key={question.id}
            control={form.control}
            name={question.id}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{question.label}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-gray-600">Laddar formulär...</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-yellow-500" />
            </div>
            <CardTitle className="text-center text-yellow-600">Länken har gått ut</CardTitle>
            <CardDescription className="text-center">
              Denna länk är inte längre giltig.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Utgången länk</AlertTitle>
              <AlertDescription>
                Länken du försöker använda har gått ut. Kontakta din optiker för att få en ny länk.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground text-center">
              Om du har frågor, kontakta din optiker direkt.
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-center text-destructive">Åtkomst nekad</CardTitle>
            <CardDescription className="text-center">
              {errorCode === 'server_error' 
                ? 'Ett tekniskt problem uppstod när vi försökte verifiera din åtkomst.' 
                : 'Vi kunde inte verifiera din åtkomst till formuläret.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fel</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            
            {errorCode && (
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Felkod: {errorCode}</p>
              </div>
            )}
            
            {diagnosticInfo && (
              <div className="mt-4 p-2 bg-gray-100 rounded text-xs font-mono text-gray-600 overflow-auto max-h-32">
                <pre>{diagnosticInfo}</pre>
              </div>
            )}
            
            <div className="mt-6">
              <Button onClick={handleRetry} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Försök igen
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground text-center">
              Om du fick länken via SMS, kontrollera att du kopierat hela länken. 
              Vid fortsatta problem, kontakta din optiker och nämn felkoden ovan.
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-center text-green-600">Tack för dina svar!</CardTitle>
            <CardDescription className="text-center">
              Din anamnes har skickats in och kommer att granskas av din optiker.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Din optiker kommer att använda denna information för att förbereda din undersökning.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center flex-col gap-4">
            <Alert variant="success">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Nästa steg</AlertTitle>
              <AlertDescription>
                Din optiker kommer att gå igenom dina svar. Du behöver inte göra något mer just nu.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground text-center">
              Du kan nu stänga denna sida.
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const currentStepQuestions = getCurrentStepQuestions();
  const isLastStep = formStep === formQuestions.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-center mb-4">
              <FileQuestion className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-center">
              {formSchema?.title || "Synundersökning: Anamnesformulär"}
            </CardTitle>
            <CardDescription className="text-center">
              Vänligen fyll i formuläret nedan för att hjälpa din optiker förbereda din undersökning.
            </CardDescription>
            {renderFormProgress()}
          </CardHeader>
          <CardContent>
            {formQuestions.length === 0 ? (
              <div className="py-4 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-muted-foreground">Laddar formulärfrågor...</p>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {currentStepQuestions.map(question => renderFormField(question))}
                  
                  <div className="flex justify-between mt-8">
                    {formStep > 0 && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={prevStep}
                      >
                        Föregående
                      </Button>
                    )}
                    
                    {!isLastStep ? (
                      <Button 
                        type="button" 
                        className={`${formStep === 0 ? 'ml-auto' : ''}`}
                        onClick={nextStep}
                      >
                        Nästa
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button 
                        type="submit" 
                        disabled={submitLoading}
                        className={`${formStep === 0 ? 'ml-auto' : ''}`}
                      >
                        {submitLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Skicka svar
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground text-center">
              All information behandlas konfidentiellt och används endast för din synundersökning.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default PatientFormPage;
