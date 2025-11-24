/**
 * Heatmap visualization showing which questions cause the most form abandonments.
 * Helps identify problematic questions that need improvement.
 */

import { useState } from 'react';
import { useFormAbandonmentData } from '@/hooks/useFormAbandonmentData';
import { useSafeOrganization } from '@/hooks/useSafeOrganization';
import { useSystemAdmin } from '@/contexts/SystemAdminContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { AlertTriangle, TrendingUp, Users, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export const FormAbandonmentHeatmap = () => {
  const { organization } = useSafeOrganization();
  const { isSystemAdmin } = useSystemAdmin();
  const [daysFilter, setDaysFilter] = useState<number>(30);

  const { data, isLoading } = useFormAbandonmentData({
    organizationId: !isSystemAdmin ? organization?.id : undefined,
    days: daysFilter,
  });

  const getHeatColor = (count: number, maxCount: number) => {
    if (maxCount === 0) return 'bg-muted';
    
    const intensity = count / maxCount;
    
    if (intensity > 0.7) return 'bg-red-500/90 text-white border-red-600';
    if (intensity > 0.5) return 'bg-orange-500/80 text-white border-orange-600';
    if (intensity > 0.3) return 'bg-yellow-500/70 text-foreground border-yellow-600';
    if (intensity > 0.1) return 'bg-blue-500/50 text-foreground border-blue-600';
    return 'bg-muted text-muted-foreground border-border';
  };

  const getIntensityLabel = (count: number, maxCount: number) => {
    if (maxCount === 0) return 'Ingen data';
    const intensity = count / maxCount;
    
    if (intensity > 0.7) return 'Kritisk';
    if (intensity > 0.5) return 'Hög';
    if (intensity > 0.3) return 'Medium';
    if (intensity > 0.1) return 'Låg';
    return 'Minimal';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Laddar abandonment data...</div>
        </CardContent>
      </Card>
    );
  }

  const summaries = data?.summaries || [];
  const totalAbandoned = summaries.reduce((sum, s) => sum + s.totalAbandoned, 0);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Totalt Abandonerade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalAbandoned}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sessioner som inte slutfördes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Formulär med Problem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summaries.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Olika formulär spårade
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tidsperiod
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      {/* Heatmap by Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Abandonment Heatmap per Formulär
          </CardTitle>
          <CardDescription>
            Varmare färg = fler användare lämnar vid denna fråga
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Ingen abandonment-data hittades för denna period</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {summaries.map((summary) => {
                const maxCount = Math.max(...summary.abandonmentsByQuestion.map(q => q.abandonmentCount));
                
                return (
                  <AccordionItem key={summary.formId} value={summary.formId}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <p className="font-semibold">{summary.formTitle}</p>
                            <p className="text-xs text-muted-foreground">
                              {summary.totalAbandoned} abandonments totalt
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {summary.abandonmentsByQuestion.length} problemfrågor
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {summary.abandonmentsByQuestion.map((question, index) => (
                          <Card
                            key={`${question.sectionIndex}-${question.questionId}`}
                            className={cn(
                              "border-2 transition-all",
                              getHeatColor(question.abandonmentCount, maxCount)
                            )}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="shrink-0">
                                      #{index + 1}
                                    </Badge>
                                    <span className="text-xs font-medium text-muted-foreground">
                                      {question.sectionTitle}
                                    </span>
                                  </div>
                                  <p className="font-medium truncate" title={question.questionText}>
                                    {question.questionText}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2 text-xs">
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      {question.abandonmentCount} abandonments
                                    </span>
                                    <span>
                                      Snitt progress: {Math.round(question.avgProgress)}%
                                    </span>
                                    <Badge 
                                      variant="outline" 
                                      className="font-mono"
                                    >
                                      {getIntensityLabel(question.abandonmentCount, maxCount)}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-2xl font-bold">
                                    {question.abandonmentCount}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {maxCount > 0 ? Math.round((question.abandonmentCount / maxCount) * 100) : 0}%
                                  </div>
                                </div>
                              </div>
                              
                              {/* Device breakdown */}
                              <div className="mt-3 pt-3 border-t border-border/50">
                                <p className="text-xs font-medium mb-2">Enhetsfördelning:</p>
                                <div className="flex gap-2 flex-wrap">
                                  {['mobile', 'desktop', 'tablet'].map(deviceType => {
                                    const count = question.sessions.filter(s => s.deviceType === deviceType).length;
                                    if (count === 0) return null;
                                    return (
                                      <Badge key={deviceType} variant="secondary" className="text-xs">
                                        {deviceType}: {count}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Färgförklaring</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded border-2 bg-red-500/90 border-red-600" />
              <span className="text-xs">Kritisk (70-100%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded border-2 bg-orange-500/80 border-orange-600" />
              <span className="text-xs">Hög (50-70%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded border-2 bg-yellow-500/70 border-yellow-600" />
              <span className="text-xs">Medium (30-50%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded border-2 bg-blue-500/50 border-blue-600" />
              <span className="text-xs">Låg (10-30%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded border-2 bg-muted border-border" />
              <span className="text-xs">Minimal (&lt;10%)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
