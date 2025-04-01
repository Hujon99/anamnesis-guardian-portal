
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
import { Loader2, AlertCircle, CheckCircle, FileQuestion } from "lucide-react";

// Define the form schema
const formSchema = z.object({
  problem: z.string().min(5, { message: "Beskriv dina synproblem (minst 5 tecken)" }),
  symptom: z.string().min(5, { message: "Beskriv dina symptom (minst 5 tecken)" }),
  current_use: z.string().min(3, { message: "Beskriv vad du använder idag (minst 3 tecken)" })
});

type FormValues = z.infer<typeof formSchema>;

const PatientFormPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [entryData, setEntryData] = useState<any>(null);

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      problem: "",
      symptom: "",
      current_use: ""
    }
  });

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("Ingen token angiven. Kontrollera länken du fick.");
        setLoading(false);
        return;
      }

      try {
        const response = await supabase.functions.invoke('verify-token', {
          body: { token }
        });

        if (response.error) {
          setError(response.error.message || "Ogiltig eller utgången token.");
          setLoading(false);
          return;
        }

        if (response.data?.success) {
          setEntryData(response.data.entry);
          
          // If this form has already been filled, show submitted state
          if (response.data.entry.status === 'ready') {
            setSubmitted(true);
          }
        } else {
          setError("Kunde inte verifiera åtkomst. Kontakta din optiker.");
        }

        setLoading(false);
      } catch (err) {
        console.error("Error verifying token:", err);
        setError("Ett tekniskt fel uppstod. Försök igen senare.");
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const onSubmit = async (values: FormValues) => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await supabase.functions.invoke('submit-form', {
        body: { 
          token,
          answers: values
        }
      });

      if (response.error) {
        setError(response.error.message || "Det gick inte att skicka formuläret.");
        setLoading(false);
        return;
      }

      setSubmitted(true);
      setLoading(false);
    } catch (err) {
      console.error("Error submitting form:", err);
      setError("Ett tekniskt fel uppstod vid inskickning. Försök igen senare.");
      setLoading(false);
    }
  };

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
              Vi kunde inte verifiera din åtkomst till formuläret.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fel</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground text-center">
              Om du fick länken via SMS, kontrollera att du kopierat hela länken. 
              Vid fortsatta problem, kontakta din optiker.
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
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground text-center">
              Du kan nu stänga denna sida.
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-center mb-4">
              <FileQuestion className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-center">Synundersökning: Anamnesformulär</CardTitle>
            <CardDescription className="text-center">
              Vänligen fyll i formuläret nedan för att hjälpa din optiker förbereda din undersökning.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="problem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vad har du för synproblem?</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Beskriv dina synproblem..." 
                          {...field} 
                          rows={3}
                        />
                      </FormControl>
                      <FormDescription>
                        Beskriv dina synproblem eller anledning till besöket.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="symptom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Har du huvudvärk eller ögontrötthet?</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Beskriv dina symptom..." 
                          {...field} 
                          rows={3}
                        />
                      </FormControl>
                      <FormDescription>
                        Beskriv eventuella symptom som huvudvärk, trötta ögon, etc.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="current_use"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Använder du glasögon eller linser idag?</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="T.ex. glasögon, linser eller ingenting" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Beskriv dina nuvarande synhjälpmedel.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Skicka svar
                </Button>
              </form>
            </Form>
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
