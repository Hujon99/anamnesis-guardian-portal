
/**
 * This component renders the header for the optician view.
 * It displays the organization name and the optician icon.
 */

import { useSafeOrganization as useOrganization } from "@/hooks/useSafeOrganization";
import { useActiveStore } from "@/contexts/ActiveStoreContext";
import { Eye, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getStoreColor, getStoreAccentColor } from "@/utils/storeColorUtils";

export const OpticianHeader = () => {
  const { organization } = useOrganization();
  const { activeStore } = useActiveStore();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Eye className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Optikervy</h1>
        {activeStore && (
          <Badge 
            className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium border transition-colors"
            style={{
              backgroundColor: getStoreColor(activeStore.name, activeStore.id).backgroundColor,
              color: getStoreColor(activeStore.name, activeStore.id).color,
              borderColor: getStoreColor(activeStore.name, activeStore.id).borderColor,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = getStoreAccentColor(activeStore.name, activeStore.id).backgroundColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = getStoreColor(activeStore.name, activeStore.id).backgroundColor;
            }}
          >
            <Store className="h-3.5 w-3.5" strokeWidth={2} />
            {activeStore.name}
          </Badge>
        )}
      </div>
      <p className="text-muted-foreground">
        Organisation: {organization?.name || "Laddar..."}
      </p>
    </div>
  );
};
