
/**
 * Custom hook for creating toast notifications.
 * This provides a unified interface for toast messages throughout the application.
 */

import * as React from "react"

import type {
  ToastActionElement,
  ToastProps as UIToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 1000000

// Export the ToastProps type for use in other files
export type ToastProps = UIToastProps

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ToastOptions = Omit<ToasterToast, "id">

const toasts = new Map<string, ToasterToast>()

const listeners: Array<(toasts: Array<ToasterToast>) => void> = []

function emitChange() {
  const allToasts = Array.from(toasts.values())
  listeners.forEach((listener) => {
    listener(allToasts)
  })
}

function addToRemoveQueue(toastId: string) {
  setTimeout(() => {
    toasts.delete(toastId)
    emitChange()
  }, TOAST_REMOVE_DELAY)
}

export function toast(opts: ToastOptions) {
  const id = genId()

  const newToast = {
    ...opts,
    id,
    open: true,
    onOpenChange: (open: boolean) => {
      if (!open) {
        toasts.delete(id)
        emitChange()
      }
    },
  }

  toasts.set(id, newToast)
  emitChange()
  addToRemoveQueue(id)

  return id
}

toast.update = (toastId: string, toast: ToastOptions) => {
  if (toasts.has(toastId)) {
    const newToast = {
      ...toasts.get(toastId),
      ...toast,
    };
    toasts.set(toastId, newToast);
    emitChange();
  }
};

toast.success = (message: string, options: Omit<ToastOptions, "variant"> = {}) => {
  return toast({
    variant: "default",
    title: "Framgång",
    description: message,
    ...options,
  });
};

toast.error = (message: string, options: Omit<ToastOptions, "variant"> = {}) => {
  return toast({
    variant: "destructive",
    title: "Fel",
    description: message,
    ...options,
  });
};

toast.dismiss = (toastId?: string) => {
  if (toastId) {
    toasts.delete(toastId)
  } else {
    toasts.clear()
  }
  emitChange()
}

export function useToast() {
  const [allToasts, setAllToasts] = React.useState<Array<ToasterToast>>([])

  React.useEffect(() => {
    function handleChange(nextToasts: Array<ToasterToast>) {
      setAllToasts([...nextToasts].slice(0, TOAST_LIMIT))
    }

    listeners.push(handleChange)
    return () => {
      const index = listeners.indexOf(handleChange)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  return {
    toasts: allToasts,
    toast,
    dismiss: toast.dismiss,
  }
}

export type { ToastOptions, ToasterToast };
