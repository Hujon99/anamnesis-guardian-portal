
/**
 * This component renders the header section for the optician form page.
 * It displays the title and information about the optician mode functionality.
 */

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const OpticianFormHeader: React.FC = () => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Optikerifyllning av anamnes</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tillbaka till Dashboard
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Fyll i detta formulär för patienten. När du är klar kommer anamnesen automatiskt att 
          markeras som "Klar för undersökning".
        </p>
      </CardContent>
    </Card>
  );
};

export default OpticianFormHeader;
