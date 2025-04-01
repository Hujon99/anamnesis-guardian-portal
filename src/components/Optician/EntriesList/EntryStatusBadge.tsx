
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
    case "draft":
      return <Badge variant="outline">Utkast</Badge>;
    case "sent":
      return <Badge variant="secondary">Skickad</Badge>;
    case "pending":
      return <Badge variant="warning">Väntar på granskning</Badge>;
    case "ready":
      return <Badge variant="success">Klar för undersökning</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};
