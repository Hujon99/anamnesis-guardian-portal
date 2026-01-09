/**
 * SubmissionErrorsView.tsx
 * 
 * Purpose: Display and analyze form submission errors, edge function errors,
 * and retry attempts from form_session_logs. This component helps system
 * administrators debug patient-reported issues where forms fail to submit.
 * 
 * Key features:
 * - Shows all submission_error, edge_function_error, and submission_retry events
 * - Filterable by date range, organization, and error type
 * - Device and browser breakdown for error patterns
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, RefreshCw, Wifi, ShieldAlert, Bug, Smartphone, Monitor, Tablet } from "lucide-react";
import { format, subDays } from "date-fns";
import { sv } from "date-fns/locale";

type ErrorEventType = 'submission_error' | 'edge_function_error' | 'submission_retry';

interface ErrorLog {
  id: string;
  session_id: string;
  entry_id: string | null;
  organization_id: string;
  event_type: string;
  error_message: string | null;
  error_type: string | null;
  event_data: Record<string, any> | null;
  device_type: string | null;
  browser: string | null;
  created_at: string;
}

const ERROR_TYPE_ICONS: Record<string, React.ReactNode> = {
  'NetworkError': <Wifi className="h-4 w-4 text-destructive" />,
  'TimeoutError': <RefreshCw className="h-4 w-4 text-amber-500" />,
  'AuthError': <ShieldAlert className="h-4 w-4 text-destructive" />,
  'EdgeFunctionError': <Bug className="h-4 w-4 text-destructive" />,
  'SubmissionError': <AlertTriangle className="h-4 w-4 text-destructive" />,
};

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  'mobile': <Smartphone className="h-4 w-4" />,
  'tablet': <Tablet className="h-4 w-4" />,
  'desktop': <Monitor className="h-4 w-4" />,
};

export const SubmissionErrorsView = () => {
  const [daysBack, setDaysBack] = useState<number>(7);
  const [filterType, setFilterType] = useState<string>('all');

  const { data: errorLogs, isLoading, error } = useQuery({
    queryKey: ['submission-errors', daysBack],
    queryFn: async () => {
      const startDate = subDays(new Date(), daysBack).toISOString();
      
      const { data, error } = await supabase
        .from('form_session_logs')
        .select('*')
        .in('event_type', ['submission_error', 'edge_function_error', 'submission_retry'])
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (error) throw error;
      return data as ErrorLog[];
    }
  });

  // Filter logs based on selected type
  const filteredLogs = useMemo(() => {
    if (!errorLogs) return [];
    if (filterType === 'all') return errorLogs;
    return errorLogs.filter(log => log.event_type === filterType);
  }, [errorLogs, filterType]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!errorLogs) return { total: 0, errors: 0, retries: 0, byType: {} };
    
    const errors = errorLogs.filter(l => l.event_type !== 'submission_retry').length;
    const retries = errorLogs.filter(l => l.event_type === 'submission_retry').length;
    
    const byType: Record<string, number> = {};
    errorLogs.forEach(log => {
      const type = log.error_type || 'Unknown';
      byType[type] = (byType[type] || 0) + 1;
    });

    return { total: errorLogs.length, errors, retries, byType };
  }, [errorLogs]);

  // Device breakdown
  const deviceBreakdown = useMemo(() => {
    if (!errorLogs) return { mobile: 0, tablet: 0, desktop: 0 };
    
    return errorLogs.reduce((acc, log) => {
      const device = log.device_type || 'desktop';
      acc[device as keyof typeof acc] = (acc[device as keyof typeof acc] || 0) + 1;
      return acc;
    }, { mobile: 0, tablet: 0, desktop: 0 });
  }, [errorLogs]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Kunde inte ladda felloggar: {(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{stats.errors}</p>
                <p className="text-sm text-muted-foreground">Submission-fel</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{stats.retries}</p>
                <p className="text-sm text-muted-foreground">Retry-försök</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{deviceBreakdown.mobile}</p>
                <p className="text-sm text-muted-foreground">Mobil-fel</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{deviceBreakdown.desktop}</p>
                <p className="text-sm text-muted-foreground">Desktop-fel</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={daysBack.toString()} onValueChange={(v) => setDaysBack(Number(v))}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Senaste 24h</SelectItem>
            <SelectItem value="7">Senaste 7 dagar</SelectItem>
            <SelectItem value="30">Senaste 30 dagar</SelectItem>
            <SelectItem value="90">Senaste 90 dagar</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla händelser</SelectItem>
            <SelectItem value="submission_error">Submission errors</SelectItem>
            <SelectItem value="edge_function_error">Edge function errors</SelectItem>
            <SelectItem value="submission_retry">Retry-försök</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error Type Breakdown */}
      {Object.keys(stats.byType).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Feltyper</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byType).map(([type, count]) => (
                <Badge key={type} variant="outline" className="flex items-center gap-1">
                  {ERROR_TYPE_ICONS[type] || <Bug className="h-3 w-3" />}
                  {type}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Felloggar ({filteredLogs.length})
          </CardTitle>
          <CardDescription>
            Detaljerad vy över submission-fel och retry-försök
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Inga fel hittades under vald period 🎉
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tid</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Feltyp</TableHead>
                    <TableHead>Meddelande</TableHead>
                    <TableHead>Enhet</TableHead>
                    <TableHead>Entry ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), 'dd MMM HH:mm', { locale: sv })}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={log.event_type === 'submission_retry' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {log.event_type === 'submission_error' && 'Fel'}
                          {log.event_type === 'edge_function_error' && 'Edge Fel'}
                          {log.event_type === 'submission_retry' && 'Retry'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {ERROR_TYPE_ICONS[log.error_type || ''] || null}
                          <span className="text-xs">{log.error_type || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        <span className="text-xs text-muted-foreground">
                          {log.error_message || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {DEVICE_ICONS[log.device_type || 'desktop']}
                          <span className="text-xs capitalize">{log.device_type || 'desktop'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.entry_id ? (
                          <code className="text-xs bg-muted px-1 rounded">
                            {log.entry_id.substring(0, 8)}...
                          </code>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
