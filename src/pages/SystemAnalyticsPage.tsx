/**
 * Dedikerad sida för systemanalys och debugging.
 * Endast synlig för system-administratörer (is_system_org = true).
 * Samlar all analysdata på ett överskådligt sätt med dashboard-layout.
 */

import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useSystemAdmin } from "@/contexts/SystemAdminContext";
import { AnalyticsDashboard } from "@/components/SystemAnalytics/AnalyticsDashboard";
import { AnalyticsNavigation } from "@/components/SystemAnalytics/AnalyticsNavigation";
import { JourneyFunnelAnalysis } from "@/components/SystemAnalytics/JourneyFunnelAnalysis";
import { FormAbandonmentHeatmap } from "@/components/AdminPanel/FormAbandonmentHeatmap";
import { FormSessionDebugView } from "@/components/AdminPanel/FormSessionDebugView";
import { SentEntriesAnalysis } from "@/components/AdminPanel/SentEntriesAnalysis";
import FormCompletionStats from "@/components/AdminPanel/FormCompletionStats";
import { SystemSettings } from "@/components/AdminPanel/SystemSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, BarChart3, Bug, Filter, Settings, TrendingUp, AlertTriangle } from "lucide-react";

export type AnalyticsSection = 
  | 'overview' 
  | 'journey' 
  | 'heatmap' 
  | 'completion'
  | 'sent-analysis'
  | 'debug' 
  | 'system';

const SystemAnalyticsPage = () => {
  const { isSystemAdmin, isLoading } = useSystemAdmin();
  const [activeSection, setActiveSection] = useState<AnalyticsSection>('overview');

  // Show loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  // Redirect non-system-admins
  if (!isSystemAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return <AnalyticsDashboard onNavigate={setActiveSection} />;
      
      case 'journey':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                Kundresa & Funnel-analys
              </CardTitle>
              <CardDescription>
                Spåra hela användarresan från consent till slutfört formulär
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JourneyFunnelAnalysis />
            </CardContent>
          </Card>
        );
      
      case 'heatmap':
        return <FormAbandonmentHeatmap />;
      
      case 'completion':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Formulär Slutförandestatistik
              </CardTitle>
              <CardDescription>
                Spårning av misslyckade formulärförsök och completion rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormCompletionStats />
            </CardContent>
          </Card>
        );
      
      case 'sent-analysis':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-accent-2" />
                'Sent' Formulär Analys
              </CardTitle>
              <CardDescription>
                Statistik över gamla formulär med status 'sent' som aldrig slutfördes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SentEntriesAnalysis />
            </CardContent>
          </Card>
        );
      
      case 'debug':
        return <FormSessionDebugView />;
      
      case 'system':
        return <SystemSettings />;
      
      default:
        return <AnalyticsDashboard onNavigate={setActiveSection} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Systemanalys
          </h1>
          <p className="text-muted-foreground mt-1">
            Analysera formulärdata, användarresor och systemprestanda
          </p>
        </div>
      </div>

      {/* Navigation */}
      <AnalyticsNavigation 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />

      {/* Content */}
      <div className="animate-in fade-in-50 duration-300">
        {renderSection()}
      </div>
    </div>
  );
};

export default SystemAnalyticsPage;
