
/**
 * Dashboard page that serves as the main landing page after authentication.
 * Shows organizational overview and quick access to main features based on user role.
 */

import { useOrganization } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Settings } from "lucide-react";

const Dashboard = () => {
  const { organization } = useOrganization();

  if (!organization) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold mb-4">Du måste tillhöra en organisation</h2>
        <p className="text-gray-600 mb-6">
          Kontakta din administratör för att bli tillagd i en organisation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Välkommen, {organization.name}</h1>
        <p className="text-muted-foreground mt-2">Här är en översikt över dina aktiviteter</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Anamneslista
            </CardTitle>
            <CardDescription>Granska och hantera anamneser</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Här kan du se alla anamneser och markera dem som klara för undersökning.</p>
            <Button asChild className="w-full">
              <Link to="/anamnes">Gå till anamneslista</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Inställningar
            </CardTitle>
            <CardDescription>Hantera kontoinställningar</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Uppdatera dina personliga inställningar och preferenser.</p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/admin">Gå till inställningar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
