/**
 * This component displays a prominent alert when multiple driving license categories
 * are selected in the form, ensuring opticians don't miss this critical information.
 * Helps prevent misunderstandings about which license types the customer wants to renew/obtain.
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Car, AlertTriangle } from "lucide-react";

interface MultipleLicenseCategoriesAlertProps {
  categories: string[];
}

export const MultipleLicenseCategoriesAlert = ({ categories }: MultipleLicenseCategoriesAlertProps) => {
  if (categories.length <= 1) return null;

  return (
    <Alert variant="destructive" className="border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
      <AlertTriangle className="h-5 w-5 text-amber-600" />
      <AlertDescription className="space-y-3">
        <div className="flex items-start gap-2">
          <Car className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <p className="font-semibold text-amber-800 dark:text-amber-200">
              OBS! Kunden vill förlänga/ta FLERA behörigheter
            </p>
            <p className="text-amber-700 dark:text-amber-300 text-sm">
              Denna kund har markerat att de vill förnya eller ta flera körkortstyper samtidigt:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((category, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-600"
                >
                  {category}
                </Badge>
              ))}
            </div>
            <p className="text-amber-700 dark:text-amber-300 text-sm font-medium">
              💡 Se till att undersökningen omfattar alla relevanta behörigheter och dokumentera detta i ditt beslut.
            </p>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};