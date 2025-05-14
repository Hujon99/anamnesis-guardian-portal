
/**
 * This file re-exports the toast functionality from our custom hook
 * to maintain consistent imports throughout the application.
 * It provides standardized toast notifications for user feedback.
 */

import { useToast, toast } from "@/hooks/use-toast";
import type { ToastProps } from "@/hooks/use-toast";

export { useToast, toast };
export type { ToastProps };
