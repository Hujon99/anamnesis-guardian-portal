/**
 * Component for analyzing started but uncompleted forms.
 * Provides insights into where users abandon forms and why.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';
import { useStartedFormsData } from '@/hooks/useStartedFormsData';
import { useSafeOrganization } from '@/hooks/useSafeOrganization';
import { useSystemAdmin } from '@/contexts/SystemAdminContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  Smartphone,
  Monitor,
  Tablet,
  Clock,
  TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { getPatientDisplayName } from '@/lib/utils';
import { getFullQuestionLocation, getProgressDescription, getSectionTitle } from '@/utils/formSchemaLookup';

export const StartedFormsAnalysis = () => {
  const { organization } = useSafeOrganization();
  const { isSystemAdmin } = useSystemAdmin();
  const { supabase } = useSupabaseClient();
  const [daysFilter, setDaysFilter] = useState<number>(30);
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [progressFilter, setProgressFilter] = useState<string>('all');

  const { data, isLoading } = useStartedFormsData({
    organizationId: !isSystemAdmin ? organization?.id : undefined,
    days: daysFilter,
  });

  // Fetch form schemas for question lookups
  const { data: formSchemas } = useQuery({
    queryKey: ['form-schemas-lookup'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase not ready');
      const { data, error } = await supabase
        .from('anamnes_forms')
        .select('id, title, schema');
      if (error) throw error;
      return data;
    },
    enabled: !!supabase,
  });

  const formSchemaMap = useMemo(() => {
    if (!formSchemas) return new Map();
    return new Map(formSchemas.map(f => [f.id, f]));
  }, [formSchemas]);

  const filteredEntries = useMemo(() => {
    if (!data?.entries) return [];
    
    return data.entries.filter(entry => {
      // Device filter
      if (deviceFilter !== 'all' && entry.device_type !== deviceFilter) {
        return false;
      }
      
      // Progress filter
      if (progressFilter !== 'all' && entry.last_progress !== null) {
        const progress = entry.last_progress;
        if (progressFilter === '0-25' && (progress < 0 || progress > 25)) return false;
        if (progressFilter === '25-50' && (progress < 25 || progress > 50)) return false;
        if (progressFilter === '50-75' && (progress < 50 || progress > 75)) return false;
        if (progressFilter === '75-100' && (progress < 75 || progress > 100)) return false;
      }
      
      return true;
    });
  }, [data?.entries, deviceFilter, progressFilter]);

  const getDeviceIcon = (deviceType: string | null) => {
    if (deviceType === 'mobile') return <Smartphone className="h-4 w-4" />;
    if (deviceType === 'tablet') return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const getTimeSinceActivity = (lastActivity: string) => {
    const now = new Date().getTime();
    const activity = new Date(lastActivity).getTime();
    const diffMinutes = Math.round((now - activity) / 1000 / 60);
    
    if (diffMinutes < 60) return `${diffMinutes} min sedan`;
    if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)} tim sedan`;
    return `${Math.round(diffMinutes / 1440)} dagar sedan`;
  };

  const getAbandonmentBadge = (lastActivity: string) => {
    const now = new Date().getTime();
    const activity = new Date(lastActivity).getTime();
    const diffMinutes = Math.round((now - activity) / 1000 / 60);
    
    if (diffMinutes > 120) {
      return <Badge variant="destructive" className="gap-1">🚩 Abandonerad</Badge>;
    }
    if (diffMinutes > 15) {
      return <Badge variant="secondary" className="gap-1">⚠️ Inaktiv</Badge>;
    }
    return <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-700 border-green-500/30">✅ Aktiv</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Laddar påbörjade formulär...</div>
        </CardContent>
      </Card>
    );
  }

  const stats = data?.stats || { total: 0, avgProgress: 0, mobileCount: 0, desktopCount: 0, tabletCount: 0 };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Påbörjade Formulär
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Senaste {daysFilter} dagarna
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Genomsnittlig Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.avgProgress}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Var användare i snitt slutar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mobila Enheter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.mobileCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.mobileCount / stats.total) * 100) : 0}% av alla
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Desktop
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.desktopCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.desktopCount / stats.total) * 100) : 0}% av alla
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Detaljerad Lista
          </CardTitle>
          <CardDescription>
            Var stannade användarna i formuläret?
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Tidsperiod</label>
              <Select value={daysFilter.toString()} onValueChange={(v) => setDaysFilter(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Senaste 7 dagarna</SelectItem>
                  <SelectItem value="30">Senaste 30 dagarna</SelectItem>
                  <SelectItem value="90">Senaste 90 dagarna</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Enhet</label>
              <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Alla enheter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla enheter</SelectItem>
                  <SelectItem value="mobile">Mobil</SelectItem>
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="tablet">Tablet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Progress</label>
              <Select value={progressFilter} onValueChange={setProgressFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Alla progress" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla progress</SelectItem>
                  <SelectItem value="0-25">0-25%</SelectItem>
                  <SelectItem value="25-50">25-50%</SelectItem>
                  <SelectItem value="50-75">50-75%</SelectItem>
                  <SelectItem value="75-100">75-100%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Stannade vid</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Enhet</TableHead>
                  <TableHead>Senaste Aktivitet</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length > 0 ? (
                  filteredEntries.map(entry => {
                    const formSchema = formSchemaMap.get(entry.form_id);
                    const location = getFullQuestionLocation(
                      formSchema?.schema as any,
                      entry.last_section_index,
                      entry.last_question_id
                    );
                    
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {getPatientDisplayName({ 
                                first_name: entry.first_name, 
                                patient_identifier: entry.patient_identifier 
                              } as any)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(entry.created_at), 'PPp', { locale: sv })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm truncate" title={location}>
                              {location}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {entry.last_progress !== null ? (
                              <>
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary transition-all"
                                    style={{ width: `${entry.last_progress}%` }}
                                  />
                                </div>
                                <span className="text-sm font-mono">{entry.last_progress}%</span>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getDeviceIcon(entry.device_type)}
                            <span className="text-xs text-muted-foreground capitalize">
                              {entry.device_type || 'Okänd'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {getTimeSinceActivity(entry.last_activity || entry.created_at)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getAbandonmentBadge(entry.last_activity || entry.created_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      <div className="flex flex-col items-center gap-2">
                        <TrendingDown className="h-12 w-12 opacity-20" />
                        <p>Inga påbörjade formulär hittades med dessa filter</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
