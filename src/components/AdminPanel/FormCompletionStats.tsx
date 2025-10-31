/**
 * Component for displaying form completion statistics and analytics.
 * Shows completion rates, failed attempts, trends, and common failure reasons.
 * Available to organization admins for their org and system admins for all orgs.
 */

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormCompletionMetrics } from "@/hooks/useFormCompletionMetrics";
import { useFailureReasons } from "@/hooks/useFailureReasons";
import { useSafeOrganization } from "@/hooks/useSafeOrganization";
import { useSystemAdmin } from "@/contexts/SystemAdminContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Store, 
  AlertTriangle,
  Calendar,
  MessageSquare
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const FormCompletionStats: React.FC = () => {
  const { organization } = useSafeOrganization();
  const { isSystemAdmin } = useSystemAdmin();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  // Calculate date range
  const dateRange = React.useMemo(() => {
    const end = new Date();
    const start = new Date();
    
    switch (timeRange) {
      case "7d":
        start.setDate(start.getDate() - 7);
        break;
      case "30d":
        start.setDate(start.getDate() - 30);
        break;
      case "90d":
        start.setDate(start.getDate() - 90);
        break;
    }
    
    return { start, end };
  }, [timeRange]);

  const { data, isLoading, error } = useFormCompletionMetrics({
    organizationId: isSystemAdmin ? undefined : organization?.id,
    dateRange,
  });

  const { data: failureData, isLoading: failureLoading } = useFailureReasons({
    organizationId: isSystemAdmin ? undefined : organization?.id,
    dateRange,
    limit: 20,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Kunde inte ladda statistik: {error instanceof Error ? error.message : "Okänt fel"}
        </AlertDescription>
      </Alert>
    );
  }

  const { metrics, trends, failureReasons } = data || {
    metrics: {
      total_online_completions: 0,
      total_store_creations: 0,
      total_reported_attempts: 0,
      estimated_completion_rate: 0,
      store_creation_rate: 0,
    },
    trends: [],
    failureReasons: [],
  };

  return (
    <div className="space-y-6">
      {/* Time Range Filter */}
      <div className="flex items-center gap-4">
        <Label htmlFor="time-range" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Tidsperiod:
        </Label>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <SelectTrigger id="time-range" className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Senaste 7 dagarna</SelectItem>
            <SelectItem value="30d">Senaste 30 dagarna</SelectItem>
            <SelectItem value="90d">Senaste 90 dagarna</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Slutförda</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_online_completions}</div>
            <p className="text-xs text-muted-foreground">
              Formulär ifyllda hemma
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Skapade i Butik</CardTitle>
            <Store className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_store_creations}</div>
            <p className="text-xs text-muted-foreground">
              Direktifyllning av optiker
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Misslyckade Försök</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_reported_attempts}</div>
            <p className="text-xs text-muted-foreground">
              Kunder som försökte men misslyckades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Slutförandegrad</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.estimated_completion_rate}%</div>
            <p className="text-xs text-muted-foreground">
              Av alla som försökte
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Completion Rate Trend Chart */}
      {trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Slutförandegrad över tid</CardTitle>
            <CardDescription>
              Visar andelen som lyckades slutföra formuläret av alla som försökte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString("sv-SE", { month: "short", day: "numeric" })}
                />
                <YAxis label={{ value: "Procent (%)", angle: -90, position: "insideLeft" }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString("sv-SE")}
                  formatter={(value: any) => [`${value}%`, "Slutförandegrad"]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Slutförandegrad (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Completions vs Attempts Bar Chart */}
      {trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Slutförda vs Misslyckade</CardTitle>
            <CardDescription>
              Jämförelse mellan lyckade och misslyckade formulärförsök per dag
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString("sv-SE", { month: "short", day: "numeric" })}
                />
                <YAxis label={{ value: "Antal", angle: -90, position: "insideLeft" }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString("sv-SE")}
                />
                <Legend />
                <Bar dataKey="completions" fill="hsl(var(--primary))" name="Slutförda" />
                <Bar dataKey="attempts" fill="hsl(12 90% 55%)" name="Misslyckade" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Detailed Failure Reasons */}
      {!failureLoading && failureData && failureData.reasons.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Detaljerade Felrapporter
                </CardTitle>
                <CardDescription>
                  Kvalitativ feedback från optiker om varför kunder inte kunde slutföra formuläret
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{failureData.stats.totalReports}</div>
                <div className="text-xs text-muted-foreground">Totalt rapporter</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Statistics summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-semibold">{failureData.stats.uniqueReasons}</div>
                  <div className="text-xs text-muted-foreground">Unika problem</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">{failureData.stats.avgReasonLength}</div>
                  <div className="text-xs text-muted-foreground">Snitt tecken/rapport</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {Math.round((failureData.stats.totalReports / failureData.stats.uniqueReasons) * 10) / 10}
                  </div>
                  <div className="text-xs text-muted-foreground">Rapporter/problem</div>
                </div>
              </div>

              {/* Failure reasons list */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-muted-foreground">
                  Vanligaste problem (sorterat efter frekvens):
                </h4>
                {failureData.reasons.map((reason, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono">
                            #{index + 1}
                          </Badge>
                          <Badge variant="outline">
                            {reason.count} {reason.count === 1 ? "fall" : "fall"}
                          </Badge>
                        </div>
                        <p className="text-sm leading-relaxed">{reason.reason}</p>
                      </div>
                    </div>
                    
                    {/* Show recent occurrences */}
                    {reason.entries && reason.entries.length > 0 && (
                      <div className="pt-2 border-t">
                        <details className="text-xs text-muted-foreground">
                          <summary className="cursor-pointer hover:text-foreground">
                            Visa detaljer ({reason.entries.length} rapporter)
                          </summary>
                          <div className="mt-2 space-y-1 pl-4">
                            {reason.entries.slice(0, 3).map((entry, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span>
                                  {new Date(entry.created_at).toLocaleDateString("sv-SE", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {entry.store_name && (
                                  <span className="text-muted-foreground">
                                    • {entry.store_name}
                                  </span>
                                )}
                              </div>
                            ))}
                            {reason.entries.length > 3 && (
                              <div className="text-muted-foreground italic">
                                ... och {reason.entries.length - 3} fler
                              </div>
                            )}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Quality assessment */}
              <Alert>
                <AlertDescription>
                  <strong>Kvalitetsbedömning:</strong>{" "}
                  {failureData.stats.avgReasonLength < 50 && (
                    <span className="text-amber-600">
                      Många rapporter är relativt korta (snitt {failureData.stats.avgReasonLength} tecken). 
                      Uppmuntra optiker att ge mer detaljerade beskrivningar för bättre felsökning.
                    </span>
                  )}
                  {failureData.stats.avgReasonLength >= 50 && failureData.stats.avgReasonLength < 100 && (
                    <span className="text-blue-600">
                      Bra nivå av detaljer i rapporterna (snitt {failureData.stats.avgReasonLength} tecken).
                    </span>
                  )}
                  {failureData.stats.avgReasonLength >= 100 && (
                    <span className="text-green-600">
                      Utmärkta detaljerade rapporter (snitt {failureData.stats.avgReasonLength} tecken)! 
                      Detta ger mycket värdefull information för felsökning.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No failure reports yet */}
      {!failureLoading && failureData && failureData.reasons.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Felrapporter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Inga felrapporter ännu för vald period</p>
              <p className="text-sm mt-2">
                När optiker rapporterar misslyckade formulärförsök kommer de att visas här
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Box */}
      <Alert>
        <AlertDescription>
          <strong>Om statistiken:</strong> Slutförandegraden beräknas som antal online-slutförda formulär 
          dividerat med summan av online-slutförda och rapporterade misslyckade försök. Detta ger en 
          uppskattning av hur många som faktiskt lyckas slutföra formuläret av alla som försöker.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default FormCompletionStats;
