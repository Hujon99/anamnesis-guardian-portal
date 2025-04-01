
import { FileSpreadsheet, Clock, AlertCircle, CheckCircle } from "lucide-react";

interface EntryStatusIconProps {
  status: string;
}

export const EntryStatusIcon = ({ status }: EntryStatusIconProps) => {
  switch (status) {
    case "draft":
      return <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />;
    case "sent":
      return <Clock className="h-4 w-4 text-blue-500" />;
    case "pending":
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    case "ready":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    default:
      return <FileSpreadsheet className="h-4 w-4" />;
  }
};
