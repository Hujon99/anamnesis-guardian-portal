
/**
 * This hook provides a consistent toast notification system using shadcn/ui.
 * It implements the Blue Pulse design concept for notifications.
 */

import { toast as sonnerToast, type ToastT } from "sonner";

type ToastProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "destructive" | "success";
  duration?: number;
};

// Define the base toast function
function toast({
  title,
  description,
  action,
  variant = "default", 
  duration = 5000,
  ...props
}: ToastProps) {
  // Set styling based on variant
  const styling = {
    default: {
      className: "group border-primary bg-background text-foreground",
      descriptionClassName: "text-muted-foreground",
    },
    destructive: {
      className: "group border-destructive bg-destructive text-destructive-foreground",
      descriptionClassName: "text-destructive-foreground/90",
    },
    success: {
      className: "group border-accent1 bg-accent1/10 text-foreground",
      descriptionClassName: "text-foreground/90",
    },
  };
  
  const { className, descriptionClassName } = styling[variant];

  return sonnerToast(title as string, {
    description,
    action,
    duration,
    className,
    descriptionClassName,
    ...props,
  });
}

// Add helper methods to the toast function
toast.success = (message: string, options?: Partial<ToastProps>) => 
  toast({ title: message, ...options, variant: "success" });

toast.error = (message: string, options?: Partial<ToastProps>) => 
  toast({ title: message, ...options, variant: "destructive" });

toast.info = (message: string, options?: Partial<ToastProps>) => 
  toast({ title: message, ...options });

toast.dismiss = sonnerToast.dismiss;

// Export the toast function with its helper methods
export { toast };

// Create and export a custom useToast hook
export const useToast = () => {
  return {
    toast,
    toasts: [] as any[], // Used by the Toaster component
  };
};
