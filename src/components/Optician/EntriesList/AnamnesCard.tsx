
/**
 * This component renders a styled card for anamnesis entries with a colored accent strip
 * based on the entry status. It provides hover animations and status-specific styling.
 */

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, Car, FileText, TrendingUp, CheckCircle, ShieldCheck, Smartphone } from "lucide-react";
import { UpgradeIndicator, hasAcceptedUpgrade } from "@/components/Optician/UpgradeIndicator";

interface AnamnesCardProps {
  status: "sent" | "pending" | "ready" | "reviewed" | "journaled" | "expiring" | "pending_id_verification";
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  examinationType?: string;
  isExaminationCompleted?: boolean;
  idVerificationCompleted?: boolean;
  answers?: Record<string, any> | null;
}

export const AnamnesCard = ({ 
  status, 
  children, 
  className, 
  onClick,
  examinationType,
  isExaminationCompleted,
  idVerificationCompleted = true,
  answers
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
      case "pending_id_verification":
        return "bg-amber-500";
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
      case 'ciss':
      case 'ciss-formulär':
        return <Smartphone className="h-3 w-3" />;
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
      case 'ciss':
      case 'ciss-formulär':
        return 'CISS';
      default:
        return 'Allmän';
    }
  };

  // Check for scoring result
  const scoringResult = answers?.scoring_result;
  const hasHighScore = scoringResult?.threshold_exceeded;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-0 p-3 rounded-lg bg-white transition-all hover:shadow-md hover:scale-[1.01] hover:bg-gray-50/80 focus-within:ring-2 focus-within:ring-ring cursor-pointer group border border-gray-100",
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
      {/* Examination type and completion badges */}
      {(examinationType || scoringResult || isExaminationCompleted || (!idVerificationCompleted && examinationType?.toLowerCase() === 'körkortsundersökning') || hasAcceptedUpgrade(answers)) && (
        <div className="flex justify-start gap-1 mb-1">
          {examinationType && (
            <Badge variant="outline" className="h-5 px-1.5 text-xs bg-white/80 backdrop-blur-sm">
              {getExaminationTypeIcon()}
              <span className="ml-1">{getExaminationTypeLabel()}</span>
            </Badge>
          )}
          
          {/* Scoring badge for CISS and other scored forms */}
          {scoringResult && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "h-5 px-1.5 text-xs font-medium cursor-help",
                      hasHighScore 
                        ? "bg-destructive/10 text-destructive border-destructive/30" 
                        : "bg-accent_teal/10 text-accent_teal border-accent_teal/30"
                    )}
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {scoringResult.total_score}/{scoringResult.max_possible_score}
                    {hasHighScore && " ⚠️"}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {hasHighScore 
                      ? `Tröskel överskriden (${Math.round(scoringResult.percentage)}%) - Uppföljning behövs` 
                      : `Poäng: ${Math.round(scoringResult.percentage)}% - Under tröskel`}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {isExaminationCompleted && examinationType?.toLowerCase() === 'körkortsundersökning' && (
            <Badge className="h-5 px-1.5 text-xs bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Klar
            </Badge>
          )}
          {!idVerificationCompleted && examinationType?.toLowerCase() === 'körkortsundersökning' && (
            <Badge className="h-5 px-1.5 text-xs bg-amber-100 text-amber-800 border-amber-200">
              <ShieldCheck className="h-3 w-3 mr-1" />
              ID saknas
            </Badge>
          )}
          {hasAcceptedUpgrade(answers) && (
            <UpgradeIndicator variant="badge" />
          )}
        </div>
      )}
      
      {children}
    </div>
  );
};
