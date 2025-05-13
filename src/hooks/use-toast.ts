
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

export function toast({
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

// Export the toast-related hooks/functions from sonner
// Instead of importing useToast directly, we'll create a custom hook
export const useToast = () => {
  // Return the toast API from sonner
  return {
    // Re-export the toast function with our own implementation
    toast,
    // Re-export any other toast-related functionality we need
    dismiss: sonnerToast.dismiss,
    error: (message: string, options?: any) => 
      toast({ title: message, ...options, variant: "destructive" }),
    success: (message: string, options?: any) => 
      toast({ title: message, ...options, variant: "success" }),
    info: (message: string, options?: any) => 
      toast({ title: message, ...options }),
    // These are used by the Toaster component
    toasts: [] as any[],
  };
};
