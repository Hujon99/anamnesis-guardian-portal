
/**
 * This component renders the header section for the optician form page.
 * It displays the title and information about the optician mode functionality.
 */

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const OpticianFormHeader: React.FC = () => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Optikerifyllning av anamnes</CardTitle>
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
