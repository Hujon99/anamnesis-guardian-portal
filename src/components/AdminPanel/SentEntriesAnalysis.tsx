/**
 * Dashboard component for system administrators to analyze old 'sent' status entries.
 * Displays monthly statistics, abandonment points, and debugging insights.
 * Only visible to system administrators.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Calendar, TrendingUp } from 'lucide-react';
import { useSentEntriesStats } from '@/hooks/useSentEntriesStats';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

export const SentEntriesAnalysis: React.FC = () => {
  const { data: stats, isLoading, error } = useSentEntriesStats();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Kunde inte hämta statistik: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt Antal 'Sent' Entries</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEntries}</div>
            <p className="text-xs text-muted-foreground">
              Formulär som aldrig slutfördes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Genomsnittlig Ålder</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageAge} dagar</div>
            <p className="text-xs text-muted-foreground">
              Sedan formulär skapades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Äldsta Entry</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.oldestEntry 
                ? format(new Date(stats.oldestEntry), 'P', { locale: sv })
                : 'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Rensas efter 120 dagar
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Antal 'Sent' Entries Per Månad</CardTitle>
          <CardDescription>
            Visar trender över tid för ofullständiga formulär
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.monthlyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={stats.monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(value) => {
                    const [year, month] = value.split('-');
                    return `${month}/${year.slice(2)}`;
                  }}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => {
                    const date = new Date(value + '-01');
                    return format(date, 'MMMM yyyy', { locale: sv });
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'count') return [value, 'Antal'];
                    if (name === 'avgAge') return [value, 'Genomsnittlig ålder (dagar)'];
                    return [value, name];
                  }}
                />
                <Legend 
                  formatter={(value) => {
                    if (value === 'count') return 'Antal';
                    if (value === 'avgAge') return 'Genomsnittlig ålder (dagar)';
                    return value;
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" name="count" />
                <Bar dataKey="avgAge" fill="hsl(var(--accent))" name="avgAge" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-muted-foreground">
              Ingen data tillgänglig
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vanligaste Problemfrågor</CardTitle>
          <CardDescription>
            Frågor där användare oftast fastnar eller överger formuläret
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.abandonmentPoints.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Fråga</TableHead>
                  <TableHead>Formulär</TableHead>
                  <TableHead className="text-right">Antal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.abandonmentPoints.map((point, index) => (
                  <TableRow key={point.questionId}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate" title={point.questionText}>
                        {point.questionText}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ID: {point.questionId}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {point.formTitle}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {point.count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Ingen problemdata tillgänglig
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Denna statistik visar alla formulär med status 'sent' som inte slutfördes. 
          Data behålls i 120 dagar för felsökning och rensas sedan automatiskt.
        </AlertDescription>
      </Alert>
    </div>
  );
};
