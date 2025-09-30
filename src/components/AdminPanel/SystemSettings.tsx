/**
 * SystemSettings Component
 * 
 * This component provides an interface for system administrators to manage
 * global default settings that apply to all organizations. It allows editing
 * of global AI prompts and form templates stored in the "system" organization.
 * 
 * Only users who are members of the system organization can access this component.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Settings } from "lucide-react";
import { AIPromptsManager } from "./AIPromptsManager";
import { useSystemAdmin } from "@/contexts/SystemAdminContext";

export function SystemSettings() {
  const { isSystemAdmin, isLoading } = useSystemAdmin();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Laddar...</div>
      </div>
    );
  }

  // Only allow access to system admins
  if (!isSystemAdmin) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Du har inte behörighet att komma åt systeminställningar.
          Endast medlemmar i systemadministratörsorganisationen kan hantera globala inställningar.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Systeminställningar</CardTitle>
          </div>
          <CardDescription>
            Hantera globala inställningar som gäller för alla organisationer.
            Ändringar här påverkar standardvärden för alla organisationer som inte har egna inställningar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Viktigt:</strong> Dessa inställningar är globala standardvärden.
              Organisationer kan överskrida dessa med egna inställningar.
            </AlertDescription>
          </Alert>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Globala AI-promptar</h3>
              <AIPromptsManager organizationId="system" />
            </div>

            {/* Future: Add global form template management here */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
