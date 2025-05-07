
/**
 * This component renders status icons for anamnesis entries.
 * It uses Lucide icons with custom styling based on the entry status.
 */

import { Clock, AlertCircle, CheckCircle, Star } from "lucide-react";

interface EntryStatusIconProps {
  status: string;
}

export const EntryStatusIcon = ({ status }: EntryStatusIconProps) => {
  switch (status) {
    case "sent":
      return <Clock className="h-4 w-4 text-primary stroke-[1.5px]" />;
    case "pending":
      return <AlertCircle className="h-4 w-4 text-accent_coral stroke-[1.5px]" />;
    case "ready":
      return <CheckCircle className="h-4 w-4 text-green-500 stroke-[1.5px]" />;
    case "reviewed":
      return <Star className="h-4 w-4 text-accent_teal stroke-[1.5px]" />;
    default:
      return <Clock className="h-4 w-4 stroke-[1.5px]" />;
  }
};
