
/**
 * This file re-exports the toast functionality from our custom hook
 * to maintain consistent imports throughout the application.
 */

import { toast as toastFunction } from "@/hooks/use-toast";

// Re-export both the hook and the toast function for consistent usage throughout the app
export { useToast } from "@/hooks/use-toast";
export const toast = toastFunction;
