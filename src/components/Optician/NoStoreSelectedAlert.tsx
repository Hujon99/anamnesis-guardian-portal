/**
 * Alert component displayed when the user has multiple stores available
 * but has not selected an active store. Guides the user to select a store
 * from the navigation menu.
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Store } from "lucide-react";

export function NoStoreSelectedAlert() {
  return (
    <Alert className="mb-6 border-accent-1/50 bg-accent-1/5">
      <Store className="h-4 w-4 text-accent-1" />
      <AlertTitle className="text-accent-1">Ingen butik vald</AlertTitle>
      <AlertDescription className="text-foreground/80">
        Du har tillgång till flera butiker. Välj en butik i menyn för att se undersökningar för den specifika butiken.
      </AlertDescription>
    </Alert>
  );
}
