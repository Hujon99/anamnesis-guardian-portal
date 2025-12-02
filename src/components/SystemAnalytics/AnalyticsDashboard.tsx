/**
 * Dashboard-komponent som visar översiktskort med viktiga KPIer.
 * Ger en snabb överblick av systemets prestanda och formulärdata.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  AlertTriangle, 
  Monitor, 
  Smartphone,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Filter
} from "lucide-react";
import { useJourneyData } from "@/hooks/useJourneyData";
import { useFormCompletionMetrics } from "@/hooks/useFormCompletionMetrics";
import type { AnalyticsSection } from "@/pages/SystemAnalyticsPage";

interface AnalyticsDashboardProps {
  onNavigate: (section: AnalyticsSection) => void;
}

export const AnalyticsDashboard = ({ onNavigate }: AnalyticsDashboardProps) => {
  const { stats: journeyStats, dropoffs, isLoading: journeyLoading } = useJourneyData({ days: 30 });
  const { data: completionData, isLoading: completionLoading } = useFormCompletionMetrics();

  const isLoading = journeyLoading || completionLoading;

  // Calculate metrics from journeyStats
  const totalStarted = journeyStats?.totalJourneys || 0;
  const totalCompleted = journeyStats?.formStarted || 0;
  const conversionRate = journeyStats?.overallConversionRate || 0;
  
  // Calculate mobile percentage
  const totalDevices = (journeyStats?.mobileCount || 0) + (journeyStats?.desktopCount || 0) + (journeyStats?.tabletCount || 0);
  const mobilePercentage = totalDevices > 0 
    ? Math.round((journeyStats?.mobileCount || 0) / totalDevices * 100)
    : 0;

  // Abandoned sessions from dropoffs
  const abandonedCount = dropoffs?.length || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Started */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Påbörjade (30 dagar)</p>
                <p className="text-3xl font-bold text-primary">{totalStarted}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Antal påbörjade formulärresor
            </p>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="bg-gradient-to-br from-accent-1/5 to-accent-1/10 border-accent-1/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Konvertering</p>
                <p className="text-3xl font-bold text-accent-1">{conversionRate}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-accent-1/10 flex items-center justify-center">
                {conversionRate >= 50 ? (
                  <TrendingUp className="h-6 w-6 text-accent-1" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-accent-2" />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Andel som når formuläret
            </p>
          </CardContent>
        </Card>

        {/* Mobile Usage */}
        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Mobil</p>
                <p className="text-3xl font-bold text-blue-600">{mobilePercentage}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Andel mobilanvändare
            </p>
          </CardContent>
        </Card>

        {/* Abandoned */}
        <Card className="bg-gradient-to-br from-accent-2/5 to-accent-2/10 border-accent-2/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pre-form avhopp</p>
                <p className="text-3xl font-bold text-accent-2">{abandonedCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-accent-2/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-accent-2" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Avhopp före formuläret (30 dagar)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Journey Funnel Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => onNavigate('journey')}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Kundresa & Funnel</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Se hela användarresan från consent till slutfört formulär. 
                  Identifiera var användare försvinner.
                </p>
                
                {/* Mini funnel preview */}
                <div className="flex items-center gap-2 mt-4 text-xs">
                  <span className="px-2 py-1 bg-muted rounded">Consent</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="px-2 py-1 bg-muted rounded">Kundinfo</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="px-2 py-1 bg-muted rounded">Val</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="px-2 py-1 bg-primary/20 rounded text-primary">Formulär</span>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </CardContent>
        </Card>

        {/* Heatmap Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => onNavigate('heatmap')}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-accent-2" />
                  <h3 className="font-semibold">Abandonment Heatmap</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Visualisera vilka frågor som orsakar mest avhopp. 
                  Färgkodad översikt av problempunkter.
                </p>
                
                {/* Mini heatmap preview */}
                <div className="flex gap-1 mt-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div 
                      key={i}
                      className={`h-6 w-6 rounded ${
                        i === 3 || i === 5 
                          ? 'bg-accent-2/60' 
                          : i === 2 
                            ? 'bg-accent-2/30' 
                            : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-accent-2 transition-colors" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Device Breakdown */}
      {journeyStats && totalDevices > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Enhetsfördelning (30 dagar)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <Smartphone className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{journeyStats.mobileCount}</p>
                <p className="text-xs text-muted-foreground">Mobil</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <Monitor className="h-8 w-8 mx-auto mb-2 text-accent-1" />
                <p className="text-2xl font-bold">{journeyStats.desktopCount}</p>
                <p className="text-xs text-muted-foreground">Desktop</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <Monitor className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{journeyStats.tabletCount}</p>
                <p className="text-xs text-muted-foreground">Tablet</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
