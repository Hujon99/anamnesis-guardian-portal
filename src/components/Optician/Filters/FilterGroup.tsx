
/**
 * Container for grouping related filters with consistent spacing and styling.
 * Provides visual separation and logical grouping of filter controls.
 */

import React from "react";
import { cn } from "@/lib/utils";

interface FilterGroupProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function FilterGroup({ title, children, className }: FilterGroupProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {title && (
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </h4>
      )}
      <div className="flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );
}
