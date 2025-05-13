
/**
 * This hook provides a centralized toast notification system.
 * It allows for consistent toast notifications throughout the application.
 * It provides typed methods for different kinds of toasts (success, error, etc.)
 * and follows the Blue Pulse design system with appropriate styling.
 */

import * as React from "react";
import { toast as sonnerToast, type ToasterProps } from "sonner";

const TOAST_LIMIT = 10;
const TOAST_REMOVE_DELAY = 1000;

// Define our toast type based on what's available in sonner + our custom properties
type ToasterToast = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "destructive"; // Match the variants from toast.tsx
  duration?: number; // Add duration property
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToasterToast;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: ToasterToast["id"];
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: ToasterToast["id"];
    };

interface State {
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: actionTypes.REMOVE_TOAST,
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;

      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }
    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
    default:
      return state;
  }
};

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

// Explicitly define toast options interface to include duration
interface ToastOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
  duration?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  id?: string;
}

// Enhanced toast interface with typed methods
type ToastProps = Omit<ToastOptions, "id">;

interface ToastAPI {
  (props: ToastProps): string;
  success: (message: string, options?: ToastProps) => string;
  error: (title: string, options?: ToastProps) => string;
  warning: (title: string, options?: ToastProps) => string;
  info: (title: string, options?: ToastProps) => string;
  dismiss: (toastId?: string) => void;
}

// Create enhanced toast function
const toast = ((props: ToastProps) => {
  const { variant = "default", ...data } = props;
  const id = props.id || genId();

  // Enhanced error logging
  if (variant === 'destructive') {
    console.error('Toast error:', data.title, data.description);
  }

  // Convert error objects to strings for better display
  let description = data.description;
  if (description instanceof Error) {
    description = description.message;
  }

  const toastData = {
    id, 
    ...data,
    description,
    variant,
    open: true,
    onOpenChange: (open: boolean) => {
      if (!open) {
        dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });
      }
    },
  };

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: toastData,
  });

  return id;
}) as ToastAPI;

// Add the typed methods to toast
toast.success = (message, options = {}) => {
  return toast({
    title: message,
    variant: "default",
    className: "bg-green-500 text-white border-green-600",
    ...options,
  });
};

toast.error = (title, options = {}) => {
  return toast({
    title,
    variant: "destructive",
    ...options,
  });
};

toast.warning = (title, options = {}) => {
  return toast({
    title,
    variant: "default",
    className: "bg-yellow-500 text-white border-yellow-600",
    ...options,
  });
};

toast.info = (title, options = {}) => {
  return toast({
    title,
    variant: "default",
    className: "bg-blue-500 text-white border-blue-600",
    ...options,
  });
};

toast.dismiss = (toastId?: string) => {
  dispatch({ type: actionTypes.DISMISS_TOAST, toastId });
};

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => {
      dispatch({ type: actionTypes.DISMISS_TOAST, toastId });
    },
  };
}

export { useToast, toast };
