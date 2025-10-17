/**
 * Upgrade Statistics Cards Component
 * 
 * Displays key metrics about upgrade conversions in card format:
 * - Total upgrade offers presented
 * - Number of upgrades accepted
 * - Conversion rate percentage
 * - Trend indicator
 * 
 * Used in the AdminPanel to show business value generated through the anamnesis portal.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Sparkles, Users, Percent } from "lucide-react";
import { useUpgradeConversions } from "@/hooks/useUpgradeConversions";
import { Skeleton } from "@/components/ui/skeleton";

interface UpgradeStatsCardsProps {
  timeRange?: 'week' | 'month' | 'year' | 'all';
  storeId?: string;
}

export function UpgradeStatsCards({ timeRange = 'month', storeId }: UpgradeStatsCardsProps) {
  const { data: stats, isLoading } = useUpgradeConversions({ timeRange, storeId });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Erbjudna uppgraderingar",
      value: stats?.total_offered || 0,
      icon: Users,
      description: "Totalt antal gånger uppgradering erbjudits",
      color: "text-blue-600",
    },
    {
      title: "Accepterade",
      value: stats?.total_accepted || 0,
      icon: Sparkles,
      description: "Patienter som valde att uppgradera",
      color: "text-amber-600",
    },
    {
      title: "Konverteringsgrad",
      value: `${stats?.conversion_rate.toFixed(1) || 0}%`,
      icon: Percent,
      description: "Andel som accepterade uppgradering",
      color: "text-teal-600",
    },
    {
      title: "Trend",
      value: stats?.conversion_rate > 0 ? "Positiv" : "—",
      icon: TrendingUp,
      description: timeRange === 'week' ? 'Senaste veckan' : timeRange === 'month' ? 'Senaste månaden' : 'Senaste året',
      color: "text-green-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}