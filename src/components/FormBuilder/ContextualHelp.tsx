/**
 * Contextual Help Component
 * Provides smart, context-aware help text that changes based on user actions and form state.
 * Guides users through form building without being intrusive.
 */

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lightbulb, CheckCircle, AlertTriangle } from 'lucide-react';

interface ContextualHelpProps {
  type: 'empty-section' | 'first-question' | 'conditional-logic' | 'scoring' | 'validation' | 'success';
  message?: string;
  className?: string;
}

const helpContent = {
  'empty-section': {
    icon: Lightbulb,
    title: 'Börja med att lägga till en fråga',
    description: 'Klicka på "Lägg till fråga" för att skapa din första fråga i denna sektion.',
    variant: 'default' as const
  },
  'first-question': {
    icon: CheckCircle,
    title: 'Bra jobbat!',
    description: 'Lägg till fler frågor eller skapa en ny sektion för att organisera ditt formulär.',
    variant: 'default' as const
  },
  'conditional-logic': {
    icon: Lightbulb,
    title: 'Villkorlig logik',
    description: 'Frågan visas bara när villkoret uppfylls. Detta ger dynamiska formulär anpassade efter användarens svar.',
    variant: 'default' as const
  },
  'scoring': {
    icon: Lightbulb,
    title: 'Poängsystem',
    description: 'Aktivera poäng för att kunna summera svar och göra bedömningar baserat på totalsumman.',
    variant: 'default' as const
  },
  'validation': {
    icon: AlertTriangle,
    title: 'Validering krävs',
    description: 'Vissa fält behöver fyllas i korrekt innan formuläret kan sparas.',
    variant: 'destructive' as const
  },
  'success': {
    icon: CheckCircle,
    title: 'Perfekt!',
    description: 'Formuläret är redo att sparas och användas.',
    variant: 'default' as const
  }
};

export const ContextualHelp: React.FC<ContextualHelpProps> = ({ 
  type, 
  message,
  className 
}) => {
  const content = helpContent[type];
  const Icon = content.icon;

  return (
    <Alert 
      variant={content.variant}
      className={`border-l-4 ${
        content.variant === 'destructive' 
          ? 'border-l-destructive bg-destructive/5' 
          : 'border-l-primary bg-primary/5'
      } animate-fade-in ${className || ''}`}
    >
      <Icon className="h-4 w-4" />
      <AlertDescription className="ml-2">
        <span className="font-medium">{content.title}</span>
        {' — '}
        <span className="text-muted-foreground">{message || content.description}</span>
      </AlertDescription>
    </Alert>
  );
};
