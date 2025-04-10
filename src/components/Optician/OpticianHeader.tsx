
/**
 * This component renders the header for the optician view.
 * It displays the organization name and the optician icon.
 */

import { useOrganization } from "@clerk/clerk-react";
import { Eye } from "lucide-react";

export const OpticianHeader = () => {
  const { organization } = useOrganization();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Eye className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Optikervy</h1>
      </div>
      <div className="space-y-1">
        <p className="text-muted-foreground">
          Organisation: {organization?.name || "Laddar..."}
        </p>
        <p className="text-xs text-muted-foreground">
          Hantera kundformulärer och skicka länkar, eller fyll i formulär direkt i butiken.
        </p>
      </div>
    </div>
  );
};
