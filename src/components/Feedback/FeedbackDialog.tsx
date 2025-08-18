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
import { useAuth } from "@clerk/clerk-react";
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
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().min(1, "Description is required").max(1000, "Description must be less than 1000 characters"),
  category: z.enum(["bug_report", "feature_request", "improvement", "other"], {
    required_error: "Please select a category",
  }),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryLabels = {
  bug_report: "Bug Report",
  feature_request: "Feature Request", 
  improvement: "Improvement Suggestion",
  other: "Other"
};

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const { userId, has } = useAuth();
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

  const organizationId = has({ role: "org:admin" }) 
    ? (localStorage.getItem("clerk-organization-id") || "") 
    : (localStorage.getItem("clerk-organization-id") || "");

  const handleSubmit = async (data: FeedbackFormData) => {
    if (!userId || !organizationId || !isReady) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please ensure you are logged in and part of an organization.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // First, insert the feedback record
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("feedback")
        .insert([
          {
            title: data.title,
            description: data.description,
            category: data.category,
            user_id: userId,
            organization_id: organizationId,
          },
        ])
        .select()
        .single();

      if (feedbackError) throw feedbackError;

      let screenshotUrl = null;

      // Upload screenshot if provided
      if (screenshot && feedbackData) {
        const fileExt = screenshot.name.split('.').pop();
        const fileName = `${feedbackData.id}/${Date.now()}.${fileExt}`;
        const filePath = `${organizationId}/${fileName}`;

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
        title: "Feedback Submitted",
        description: "Thank you for your feedback! We'll review it soon.",
      });

      // Reset form and close dialog
      form.reset();
      setScreenshot(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "Failed to submit feedback. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Send Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve the application by sharing your feedback, reporting bugs, or suggesting new features.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief description of your feedback"
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
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select feedback type" />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please provide detailed information about your feedback..."
                      className="min-h-[100px]"
                      {...field}
                      maxLength={1000}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Screenshot (Optional)</label>
              <ImageUploader
                file={screenshot}
                onFileChange={setScreenshot}
                onRemove={() => setScreenshot(null)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Feedback
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