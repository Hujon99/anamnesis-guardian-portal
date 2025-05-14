
/**
 * This component renders a styled card for anamnesis entries with a colored accent strip
 * based on the entry status. It provides hover animations and status-specific styling.
 */

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AnamnesCardProps {
  status: "sent" | "pending" | "ready" | "reviewed" | "journaled" | "expiring";
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const AnamnesCard = ({ 
  status, 
  children, 
  className, 
  onClick 
}: AnamnesCardProps) => {
  // Determine the accent color based on status
  const getAccentColor = () => {
    switch (status) {
      case "sent":
        return "bg-primary/50";
      case "pending":
        return "bg-accent_coral";
      case "ready":
        return "bg-green-500";
      case "journaled":
        return "bg-accent_teal";
      case "reviewed": // Keep for backward compatibility
        return "bg-accent_teal";
      case "expiring":
        return "bg-amber-500";
      default:
        return "bg-gray-300";
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col gap-2 p-4 rounded-2xl bg-white transition-all hover:shadow-lg/20 hover:scale-[1.01] hover:bg-gray-50/80 focus-within:ring-2 focus-within:ring-ring cursor-pointer group",
        className
      )}
      onClick={onClick}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
          e.preventDefault();
        }
      }}
    >
      <div className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl ${getAccentColor()}`} />
      {children}
    </div>
  );
};
