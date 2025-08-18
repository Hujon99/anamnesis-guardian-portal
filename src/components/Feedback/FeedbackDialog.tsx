/**
 * FeedbackDialog Component
 * 
 * This component provides a dialog interface for users to submit feedback about the application.
 * It includes a form with title, description, category selection, and optional screenshot upload.
 * All feedback is stored in Supabase with automatic user and organization tracking.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth, useOrganization } from "@clerk/clerk-react";
import { MessageSquare, Send, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { ImageUploader } from "./ImageUploader";

const feedbackSchema = z.object({
  title: z.string().min(1, "Titel krävs").max(100, "Titel måste vara kortare än 100 tecken"),
  description: z.string().min(1, "Beskrivning krävs").max(1000, "Beskrivning måste vara kortare än 1000 tecken"),
  category: z.enum(["bug_report", "feature_request", "improvement", "other"], {
    required_error: "Välj en kategori",
  }),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryLabels = {
  bug_report: "Buggrapport",
  feature_request: "Funktionsförslag", 
  improvement: "Förbättringsförslag",
  other: "Övrigt"
};

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const { userId } = useAuth();
  const { organization } = useOrganization();
  const { supabase, isReady } = useSupabaseClient();
  const { toast } = useToast();
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  // Validate file before upload
  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (file.size > maxSize) {
      return { isValid: false, error: "Filen är för stor. Max storlek är 10MB." };
    }
    
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: "Filformat stöds inte. Använd JPG, PNG, GIF eller WebP." };
    }
    
    return { isValid: true };
  };

  const handleSubmit = async (data: FeedbackFormData) => {
    console.log("=== FEEDBACK SUBMISSION START ===");
    console.log("Form values:", data);
    console.log("Screenshot:", screenshot?.name);
    console.log("User ID:", userId);
    console.log("Organization ID:", organization?.id);
    console.log("Supabase ready:", isReady);
    
    if (!userId || !organization?.id || !isReady) {
      console.error("Missing required data for submission");
      toast({
        variant: "destructive",
        title: "Autentiseringsfel",
        description: "Du måste vara inloggad och tillhöra en organisation.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("=== STEP 1: INSERTING FEEDBACK TO DATABASE ===");
      
      // Always insert feedback first, regardless of image
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("feedback")
        .insert([
          {
            title: data.title,
            description: data.description,
            category: data.category,
            user_id: userId,
            organization_id: organization.id,
            status: 'open'
          },
        ])
        .select()
        .single();

      if (feedbackError) {
        console.error("Database insert failed:", feedbackError);
        throw new Error(`Kunde inte spara feedback: ${feedbackError.message}`);
      }

      console.log("✅ Feedback saved to database with ID:", feedbackData.id);

      // Handle image upload separately (optional - don't fail if this fails)
      let imageUploadSuccess = false;
      if (screenshot) {
        console.log("=== STEP 2: UPLOADING IMAGE ===");
        
        // Validate file first
        const validation = validateFile(screenshot);
        if (!validation.isValid) {
          console.warn("File validation failed:", validation.error);
          toast({
            variant: "destructive",
            title: "Bildfel",
            description: validation.error + " Feedback skickades utan bild.",
          });
        } else {
          try {
            const fileExt = screenshot.name.split('.').pop();
            const fileName = `${feedbackData.id}_${Date.now()}.${fileExt}`;
            const filePath = `${organization.id}/${fileName}`;
            
            console.log("Uploading to path:", filePath);

            const { error: uploadError } = await supabase.storage
              .from("feedback-screenshots")
              .upload(filePath, screenshot, {
                cacheControl: "3600",
                upsert: false,
              });

            if (uploadError) {
              console.error("Image upload failed:", uploadError);
              toast({
                variant: "destructive",
                title: "Bilduppladdning misslyckades",
                description: "Feedback skickades men bilden kunde inte laddas upp.",
              });
            } else {
              console.log("✅ Image uploaded successfully");
              
              // Update feedback with screenshot URL
              const { error: updateError } = await supabase
                .from("feedback")
                .update({ screenshot_url: filePath })
                .eq("id", feedbackData.id);
                
              if (updateError) {
                console.error("Failed to update screenshot URL:", updateError);
                toast({
                  variant: "destructive",
                  title: "Bildlänkning misslyckades",
                  description: "Bilden laddades upp men kunde inte länkas till feedback.",
                });
              } else {
                console.log("✅ Screenshot URL saved to database");
                imageUploadSuccess = true;
              }
            }
          } catch (imageError) {
            console.error("Image upload process failed:", imageError);
            // Don't fail the entire submission for image issues
          }
        }
      }

      // Success message
      const successMessage = imageUploadSuccess 
        ? "Feedback och bild skickades framgångsrikt!"
        : "Feedback skickades framgångsrikt!";
        
      toast({
        title: "Tack för din feedback!",
        description: successMessage,
      });

      console.log("=== SUBMISSION COMPLETED SUCCESSFULLY ===");

      // Reset and close
      form.reset();
      setScreenshot(null);
      onOpenChange(false);

    } catch (error) {
      console.error("=== SUBMISSION FAILED ===", error);
      toast({
        variant: "destructive",
        title: "Kunde inte skicka feedback",
        description: error instanceof Error ? error.message : "Ett oväntat fel inträffade. Försök igen.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-8">
        <DialogHeader className="space-y-4">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Skicka feedback
          </DialogTitle>
          <DialogDescription>
            Hjälp oss förbättra applikationen genom att dela din feedback, rapportera buggar eller föreslå nya funktioner.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titel</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Kort beskrivning av din feedback"
                      {...field}
                      maxLength={100}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj typ av feedback" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beskrivning</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Vänligen ge detaljerad information om din feedback..."
                      className="min-h-[100px]"
                      {...field}
                      maxLength={1000}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <label className="text-sm font-medium">Skärmbild (Valfritt)</label>
              <ImageUploader
                file={screenshot}
                onFileChange={setScreenshot}
                onRemove={() => setScreenshot(null)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Avbryt
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Skickar...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Skicka feedback
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}