
/**
 * Popover component for displaying contextual content.
 * This component provides a floating UI element that appears relative to a trigger element,
 * with customizable positioning and animation.
 */

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => {
  // Enhanced safety: Ensure children is never undefined or null
  const safeProps = { ...props };
  
  if (safeProps.children == null) {
    safeProps.children = <></>;
  }
  
  // Extra safety check for child rendering errors
  const renderSafeChildren = () => {
    try {
      // If children is a function, call it safely
      if (typeof safeProps.children === 'function') {
        const renderedChildren = safeProps.children();
        return renderedChildren || <></>;
      }
      return safeProps.children;
    } catch (error) {
      console.error('Error rendering Popover children:', error);
      return <div className="p-2 text-destructive">Rendering error</div>;
    }
  };
  
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 rounded-md border bg-white p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...safeProps}
      >
        {renderSafeChildren()}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
});

PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
