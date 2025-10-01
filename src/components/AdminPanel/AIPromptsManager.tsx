/**
 * AI Prompts Manager Component
 * Placeholder for upcoming AI prompt customization feature
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface AIPromptsManagerProps {
  organizationId: string;
}

export const AIPromptsManager: React.FC<AIPromptsManagerProps> = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI-promptar</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-accent-1/10 text-accent-1 border-accent-1/20">
            Kommer snart
          </Badge>
        </div>
        <CardDescription>
          Anpassa de system-promptar som styr hur AI:n sammanfattar anamneser för olika undersökningstyper
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-12 px-4">
          <div className="text-center space-y-3 max-w-md">
            <div className="flex justify-center">
              <div className="rounded-full bg-accent-1/10 p-3">
                <Sparkles className="h-8 w-8 text-accent-1" />
              </div>
            </div>
            <p className="text-muted-foreground">
              Funktionen för att anpassa AI-promptar håller på att utvecklas och kommer att göras tillgänglig inom kort.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
