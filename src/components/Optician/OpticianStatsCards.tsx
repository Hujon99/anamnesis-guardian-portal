
/**
 * This component displays statistics cards for the optician dashboard.
 * It shows key metrics like total entries and entries in each status category.
 */

import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, InboxIcon, Send, Archive } from "lucide-react";

interface OpticianStatsProps {
  stats: {
    total: number;
    pending: number;
    ready: number;
    reviewed: number;
    sent: number;
  };
}

export function OpticianStatsCards({ stats }: OpticianStatsProps) {
  const statCards = [
    {
      title: "Totalt",
      value: stats.total,
      icon: InboxIcon,
      color: "bg-primary text-primary-foreground",
    },
    {
      title: "Att granska",
      value: stats.pending,
      icon: Clock,
      color: "bg-amber-500 text-white",
    },
    {
      title: "Klara",
      value: stats.ready,
      icon: CheckCircle2,
      color: "bg-green-500 text-white",
    },
    {
      title: "Journalförda",
      value: stats.reviewed,
      icon: Archive,
      color: "bg-accent-1 text-white",
    },
    {
      title: "Skickade",
      value: stats.sent,
      icon: Send,
      color: "bg-accent-2 text-white",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.title} className="shadow-sm bg-surface_light">
          <CardContent className="p-4">
            <div className="flex flex-col items-center sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className={`p-2 rounded-full ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col items-center sm:items-end">
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.title}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
