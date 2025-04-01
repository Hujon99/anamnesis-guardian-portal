
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
      return <Badge variant="secondary">Skickad</Badge>;
    case "pending":
      return <Badge variant="warning">Väntar på granskning</Badge>;
    case "ready":
      return <Badge variant="success">Klar för undersökning</Badge>;
    case "reviewed":
      return <Badge className="bg-purple-500 text-white">Granskad</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};
