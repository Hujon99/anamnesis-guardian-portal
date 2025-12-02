/**
 * Komponent för att visa kundresa och funnel-analys.
 * Kombinerar pre-form journey data med in-form abandonment data.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowRight, 
  Clock, 
  Monitor, 
  Smartphone, 
  Tablet,
  TrendingDown,
  AlertCircle
} from "lucide-react";
import { useJourneyData } from "@/hooks/useJourneyData";
import { StartedFormsAnalysis } from "@/components/AdminPanel/StartedFormsAnalysis";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

export const JourneyFunnelAnalysis = () => {
  const [activeTab, setActiveTab] = useState<'funnel' | 'dropoffs' | 'in-form'>('funnel');
  const { stats, dropoffs, isLoading, error } = useJourneyData({ days: 30 });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
        <p>Kunde inte ladda journey-data</p>
      </div>
    );
  }

  // Calculate funnel steps using correct property names
  const funnelSteps = [
    { 
      id: 'consent', 
      label: 'Consent', 
      count: stats?.consentPageViews || 0,
      completed: stats?.consentCompleted || 0
    },
    { 
      id: 'customer_info', 
      label: 'Kundinfo', 
      count: stats?.customerInfoViews || 0,
      completed: stats?.customerInfoCompleted || 0
    },
    { 
      id: 'examination_selection', 
      label: 'Undersökningsval', 
      count: stats?.examinationSelectionViews || 0,
      completed: stats?.examinationSelectionCompleted || 0
    },
    { 
      id: 'form', 
      label: 'Formulär', 
      count: stats?.formStarted || 0,
      completed: stats?.formStarted || 0
    },
  ];

  const maxCount = Math.max(...funnelSteps.map(s => s.count), 1);

  const getDeviceIcon = (device: string | null) => {
    switch (device) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="funnel">Funnel-översikt</TabsTrigger>
          <TabsTrigger value="dropoffs">
            Pre-form avhopp
            {dropoffs && dropoffs.length > 0 && (
              <Badge variant="secondary" className="ml-2">{dropoffs.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="in-form">In-form analys</TabsTrigger>
        </TabsList>

        <TabsContent value="funnel" className="space-y-6 mt-6">
          {/* Visual Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Konverteringsfunnel (30 dagar)</CardTitle>
              <CardDescription>
                Visualisering av användarresan från consent till slutfört formulär
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {funnelSteps.map((step, index) => {
                  const widthPercent = (step.count / maxCount) * 100;
                  const nextStep = funnelSteps[index + 1];
                  const dropoffRate = nextStep 
                    ? Math.round(((step.count - nextStep.count) / Math.max(step.count, 1)) * 100)
                    : 0;
                  
                  return (
                    <div key={step.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{step.label}</span>
                        <span className="text-muted-foreground">
                          {step.count} besök · {step.completed} slutförda
                        </span>
                      </div>
                      <div className="relative h-10 bg-muted rounded-lg overflow-hidden">
                        <div 
                          className="absolute inset-y-0 left-0 bg-primary/20 transition-all duration-500"
                          style={{ width: `${widthPercent}%` }}
                        />
                        <div 
                          className="absolute inset-y-0 left-0 bg-primary transition-all duration-500"
                          style={{ width: `${(step.completed / maxCount) * 100}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                          {step.count > 0 && (
                            <span className="bg-background/80 px-2 py-0.5 rounded">
                              {Math.round((step.completed / Math.max(step.count, 1)) * 100)}% slutförde
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Dropoff indicator */}
                      {nextStep && dropoffRate > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground ml-4">
                          <ArrowRight className="h-3 w-3" />
                          <TrendingDown className="h-3 w-3 text-accent-2" />
                          <span className="text-accent-2">{dropoffRate}% avhopp</span>
                          <span>({step.count - nextStep.count} användare)</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Summary stats */}
              <div className="mt-6 pt-6 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{stats?.totalJourneys || 0}</p>
                  <p className="text-xs text-muted-foreground">Totala resor</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-accent-1">{stats?.formStarted || 0}</p>
                  <p className="text-xs text-muted-foreground">Nådde formuläret</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.overallConversionRate || 0}%</p>
                  <p className="text-xs text-muted-foreground">Total konvertering</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-accent-2">{dropoffs?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Avhopp före formulär</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Device breakdown */}
          {stats && (stats.mobileCount > 0 || stats.desktopCount > 0 || stats.tabletCount > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Enhetsfördelning</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <Smartphone className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{stats.mobileCount}</p>
                    <p className="text-xs text-muted-foreground">Mobil</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <Monitor className="h-8 w-8 mx-auto mb-2 text-accent-1" />
                    <p className="text-2xl font-bold">{stats.desktopCount}</p>
                    <p className="text-xs text-muted-foreground">Desktop</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <Tablet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-2xl font-bold">{stats.tabletCount}</p>
                    <p className="text-xs text-muted-foreground">Tablet</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="dropoffs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Avhopp före formuläret</CardTitle>
              <CardDescription>
                Användare som lämnade innan de nådde själva formuläret
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!dropoffs || dropoffs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Inga pre-form avhopp hittades de senaste 30 dagarna</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {dropoffs.map((dropoff) => (
                    <div 
                      key={dropoff.journey_id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-accent-2/10 flex items-center justify-center">
                          {getDeviceIcon(dropoff.device_type)}
                        </div>
                        <div>
                          <p className="font-medium">
                            Avslutade på: <span className="text-accent-2">{dropoff.last_page}</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Senaste händelse: {dropoff.last_event}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{Math.round(dropoff.time_spent_seconds / 60)} min</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(dropoff.last_activity), { 
                            addSuffix: true, 
                            locale: sv 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="in-form" className="mt-6">
          <StartedFormsAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
};
