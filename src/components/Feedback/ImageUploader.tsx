/**
 * ImageUploader Component
 * 
 * This component provides a drag-and-drop image upload interface for feedback screenshots.
 * It supports common image formats, validates file size, and provides image preview functionality.
 * Files are optimized for upload to Supabase storage.
 */

import { useCallback, useState } from "react";
import { Upload, X, Image as ImageIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ImageUploaderProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  onRemove: () => void;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ImageUploader({ file, onFileChange, onRemove }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Ogiltigt filformat",
        description: "Vänligen ladda upp en JPG, PNG eller WebP bild.",
      });
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        variant: "destructive",
        title: "Filen är för stor",
        description: "Vänligen ladda upp en bild som är mindre än 2MB.",
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!validateFile(selectedFile)) return;

    onFileChange(selectedFile);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  }, [onFileChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleRemove = () => {
    onRemove();
    setPreview(null);
  };

  if (file && preview) {
    return (
      <div className="relative">
        <div className="border-2 border-dashed border-border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <img
                src={preview}
                alt="Preview"
                className="w-16 h-16 object-cover rounded-md border"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="flex-shrink-0 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50"
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="space-y-2">
        <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-muted">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            Dra och släpp en bild här, eller{" "}
            <label className="text-primary hover:text-primary/80 cursor-pointer underline">
              bläddra
              <input
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                onChange={handleFileInput}
                className="sr-only"
              />
            </label>
          </p>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, WebP upp till 2MB
          </p>
        </div>
      </div>
    </div>
  );
}