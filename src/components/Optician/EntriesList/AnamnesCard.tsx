
/**
 * This component renders a styled card for anamnesis entries with a colored accent strip
 * based on the entry status. It provides hover animations and status-specific styling.
 */

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Eye, Car, FileText } from "lucide-react";

interface AnamnesCardProps {
  status: "sent" | "pending" | "ready" | "reviewed" | "journaled" | "expiring";
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  examinationType?: string;
  isExaminationCompleted?: boolean;
}

export const AnamnesCard = ({ 
  status, 
  children, 
  className, 
  onClick,
  examinationType,
  isExaminationCompleted
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

  const getExaminationTypeIcon = () => {
    const normalizedType = examinationType?.toLowerCase();
    switch (normalizedType) {
      case 'synundersökning':
        return <Eye className="h-3 w-3" />;
      case 'körkortsundersökning':
        return <Car className="h-3 w-3" />;
      case 'linsundersökning':
        return <Eye className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const getExaminationTypeLabel = () => {
    const normalizedType = examinationType?.toLowerCase();
    switch (normalizedType) {
      case 'synundersökning':
        return 'Synundersökning';
      case 'körkortsundersökning':
        return 'Körkort';
      case 'linsundersökning':
        return 'Linser';
      case 'allmän':
        return 'Allmän';
      default:
        return 'Allmän';
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 p-2 rounded-xl bg-white transition-all hover:shadow-lg/20 hover:scale-[1.01] hover:bg-gray-50/80 focus-within:ring-2 focus-within:ring-ring cursor-pointer group",
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
      <div className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${getAccentColor()}`} />
      
      {/* Examination type and completion badges - properly positioned */}
      {(examinationType || isExaminationCompleted) && (
        <div className="flex justify-end gap-1 mb-1">
          {examinationType && (
            <Badge variant="outline" className="h-5 px-1.5 text-xs bg-white/80 backdrop-blur-sm">
              {getExaminationTypeIcon()}
              <span className="ml-1">{getExaminationTypeLabel()}</span>
            </Badge>
          )}
          {isExaminationCompleted && examinationType?.toLowerCase() === 'körkortsundersökning' && (
            <Badge className="h-5 px-1.5 text-xs bg-green-100 text-green-800 border-green-200">
              Klar
            </Badge>
          )}
        </div>
      )}
      
      {children}
    </div>
  );
};
