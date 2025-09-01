
/**
 * This component renders status badges for anamnesis entries.
 * It provides visual feedback about the current status of an entry.
 */

import { Badge } from "@/components/ui/badge";

interface EntryStatusBadgeProps {
  status: string;
  isExpired?: boolean;
  isRedacted?: boolean;
}

export const EntryStatusBadge = ({ status, isExpired, isRedacted }: EntryStatusBadgeProps) => {
  if (isRedacted) {
    const isJournaled = status === "journaled" || status === "reviewed";
    return (
      <Badge variant="secondary" className="bg-muted/40 text-muted-foreground border-muted/50">
        {isJournaled ? "Journalförd och gallrad" : "Gallrad"}
      </Badge>
    );
  }
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
    case "journaled":
      return <Badge className="bg-accent_teal/10 text-accent_teal border-accent_teal/20 hover:bg-accent_teal/20">Journalförd</Badge>;
    case "reviewed": // Keep for backward compatibility
      return <Badge className="bg-accent_teal/10 text-accent_teal border-accent_teal/20 hover:bg-accent_teal/20">Journalförd</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};
