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

  const handleSubmit = async (data: FeedbackFormData) => {
    console.log("Form submitted with data:", data);
    console.log("User ID:", userId);
    console.log("Organization:", organization);
    console.log("Supabase ready:", isReady);
    
    if (!userId || !organization?.id || !isReady) {
      console.log("Validation failed - missing required data");
      toast({
        variant: "destructive",
        title: "Fel",
        description: "Se till att du är inloggad och tillhör en organisation.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Starting feedback submission...");
      // First, insert the feedback record
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("feedback")
        .insert([
          {
            title: data.title,
            description: data.description,
            category: data.category,
            user_id: userId,
            organization_id: organization.id,
          },
        ])
        .select()
        .single();

      console.log("Feedback insert result:", { feedbackData, feedbackError });

      if (feedbackError) throw feedbackError;

      let screenshotUrl = null;

      // Upload screenshot if provided
      if (screenshot && feedbackData) {
        const fileExt = screenshot.name.split('.').pop();
        const fileName = `${feedbackData.id}/${Date.now()}.${fileExt}`;
        const filePath = `${organization.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("feedback-screenshots")
          .upload(filePath, screenshot, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Screenshot upload error:", uploadError);
          // Don't fail the entire submission for screenshot upload failure
        } else {
          screenshotUrl = filePath;
        }
      }

      // Update feedback with screenshot URL if uploaded
      if (screenshotUrl) {
        await supabase
          .from("feedback")
          .update({ screenshot_url: screenshotUrl })
          .eq("id", feedbackData.id);
      }

      toast({
        variant: "default",
        title: "Feedback skickat",
        description: "Tack för din feedback! Vi kommer att granska den snart.",
      });

      // Reset form and close dialog
      form.reset();
      setScreenshot(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        variant: "destructive",
        title: "Inlämning misslyckades",
        description: "Kunde inte skicka feedback. Försök igen.",
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