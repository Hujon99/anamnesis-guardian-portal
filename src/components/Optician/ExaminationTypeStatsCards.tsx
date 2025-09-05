/**
 * This component displays examination type statistics cards for the optician.
 * It shows the distribution of different examination types (Synundersökning, Körkortsundersökning, etc.)
 * instead of status-based statistics, providing more actionable insights for opticians.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Eye, Car, Stethoscope } from "lucide-react";

interface ExaminationTypeStatsProps {
  stats: {
    examinations: {
      synundersokning: number;
      korkortsundersokning: number;
      other: number;
    };
    total: number;
  };
}

export function ExaminationTypeStatsCards({ stats }: ExaminationTypeStatsProps) {
  const examinationCards = [
    {
      title: "Synundersökningar",
      value: stats.examinations.synundersokning,
      icon: Eye,
      color: "bg-primary text-primary-foreground",
    },
    {
      title: "Körkortsundersökningar", 
      value: stats.examinations.korkortsundersokning,
      icon: Car,
      color: "bg-accent-1 text-white",
    },
    {
      title: "Övriga undersökningar",
      value: stats.examinations.other,
      icon: Stethoscope,
      color: "bg-accent-2 text-white",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {examinationCards.map((stat) => (
        <Card key={stat.title} className="shadow-sm bg-surface_light">
          <CardContent className="p-4">
            <div className="flex flex-col items-center sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className={`p-2 rounded-full ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col items-center sm:items-end">
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground text-center sm:text-right">{stat.title}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}