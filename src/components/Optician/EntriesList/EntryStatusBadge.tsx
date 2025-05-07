
/**
 * This component renders status badges for anamnesis entries.
 * It provides visual feedback about the current status of an entry.
 */

import { Badge } from "@/components/ui/badge";

interface EntryStatusBadgeProps {
  status: string;
  isExpired?: boolean;
}

export const EntryStatusBadge = ({ status, isExpired }: EntryStatusBadgeProps) => {
  if (isExpired) {
    return <Badge variant="destructive">Utgången</Badge>;
  }
  
  switch (status) {
    case "sent":
      return <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">Skickad</Badge>;
    case "pending":
      return <Badge variant="warning" className="bg-accent_coral/10 text-accent_coral border-accent_coral/20 hover:bg-accent_coral/20">Väntar på granskning</Badge>;
    case "ready":
      return <Badge variant="success" className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20">Klar för undersökning</Badge>;
    case "reviewed":
      return <Badge className="bg-accent_teal/10 text-accent_teal border-accent_teal/20 hover:bg-accent_teal/20">Granskad</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};
