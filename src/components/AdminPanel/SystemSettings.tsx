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
import { AlertCircle, Settings, LogOut } from "lucide-react";
import { AIPromptsManager } from "./AIPromptsManager";
import { useSystemAdmin } from "@/contexts/SystemAdminContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function SystemSettings() {
  const { isSystemAdmin, logout } = useSystemAdmin();
  const navigate = useNavigate();

  // Only allow access to system admins
  if (!isSystemAdmin) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Du har inte behörighet att komma åt systeminställningar.
          Endast systemadministratörer kan hantera globala inställningar.
        </AlertDescription>
      </Alert>
    );
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
          <LogOut className="h-4 w-4" />
          Logga ut från systemadmin
        </Button>
      </div>
      
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
