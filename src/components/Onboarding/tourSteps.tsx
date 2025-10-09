/**
 * Configuration for onboarding tour steps.
 * Defines all the steps, targets, and content for the guided tour experience.
 * Steps are dynamically filtered based on user role (optician, admin).
 */

import { Step } from 'react-joyride';

export const getTourSteps = (isOptician: boolean, isAdmin: boolean): Step[] => {
  const baseSteps: Step[] = [
    {
      target: 'body',
      content: (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Välkommen till Anamnesportalen</h2>
          <p className="text-muted-foreground">
            Vi hjälper dig att digitalisera och hantera patientanamneser på ett säkert och effektivt sätt.
          </p>
          <p className="text-sm text-muted-foreground">
            Den här guiden visar dig de viktigaste funktionerna. Du kan när som helst hoppa över med ESC-tangenten eller återuppta guiden senare.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
      styles: {
        options: {
          width: 600,
        },
      },
    },
    {
      target: '[data-tour="direct-form"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Skapa anamnes i butik 🏪</h3>
          <p className="text-sm text-muted-foreground">
            Använd denna funktion när en kund är på plats i butiken. Du kan då fylla i anamnesen direkt tillsammans med kunden.
          </p>
          <p className="text-xs text-muted-foreground">
            Formulären är responsiva och fungerar perfekt på alla enheter - mobil, surfplatta och dator.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="stats-cards"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Översikt 📊</h3>
          <p className="text-sm text-muted-foreground">
            Här ser du en snabb översikt över dina anamneser - filtrerade resultat, totalt antal och eventuella bokningar för idag.
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '[data-tour="today-bookings"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Dagens bokningar 📅</h3>
          <p className="text-sm text-muted-foreground">
            Här visas alla anamneser med bokningar för idag. Perfekt för att snabbt se vilka kunder som kommer in.
          </p>
          <p className="text-xs text-muted-foreground">
            Sektionen visas automatiskt när det finns bokningar för dagens datum.
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '[data-tour="filters"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Filtrera anamneser 🔍</h3>
          <p className="text-sm text-muted-foreground">
            Använd dessa filter för att snabbt hitta rätt anamnes. Du kan filtrera på status, undersökningstyp, tidsperiod och mer.
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '[data-tour="entries-list"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Anamnes-lista 📋</h3>
          <p className="text-sm text-muted-foreground">
            Här visas alla dina anamneser. Klicka på en rad för att se detaljer, redigera eller hantera undersökningsresultat.
          </p>
          <p className="text-xs text-muted-foreground">
            Du kan snabbt tilldela optiker, ändra status och mer direkt från listan.
          </p>
        </div>
      ),
      placement: 'top',
    },
  ];

  // Add optician/admin specific steps
  if (isOptician || isAdmin) {
    baseSteps.push({
      target: '[data-tour="my-anamnesis"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Mina anamneser 👤</h3>
          <p className="text-sm text-muted-foreground">
            Här ser du alla anamneser som är tilldelade till dig. Ett snabbt sätt att se vad som väntar på din granskning.
          </p>
        </div>
      ),
      placement: 'right',
    });
  }

  // Add admin specific steps
  if (isAdmin) {
    baseSteps.push({
      target: '[data-tour="admin-panel"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Administration ⚙️</h3>
          <p className="text-sm text-muted-foreground">
            Som admin har du tillgång till administrationspanelen där du kan hantera butiker, formulär och organisationsinställningar.
          </p>
        </div>
      ),
      placement: 'right',
    });
  }

  // Always add feedback as the last step
  baseSteps.push({
    target: '[data-tour="feedback"]',
    content: (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Skicka feedback 💬</h3>
        <p className="text-sm text-muted-foreground">
          Har du förslag på förbättringar eller hittat något fel? Använd feedback-knappen för att kontakta oss direkt.
        </p>
      </div>
    ),
    placement: 'left',
  });

  // Final step
  baseSteps.push({
    target: 'body',
    content: (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Redo att börja! 🚀</h2>
        <p className="text-muted-foreground">
          Du är nu redo att använda Anamnesis Guardian. Du kan när som helst visa guiden igen från sidomenyn.
        </p>
        <p className="text-sm text-muted-foreground">
          Lycka till!
        </p>
      </div>
    ),
    placement: 'center',
    styles: {
      options: {
        width: 600,
      },
    },
  });

  return baseSteps;
};
