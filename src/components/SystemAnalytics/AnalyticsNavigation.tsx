/**
 * Navigation-komponent för System Analytics-sidan.
 * Visar tydliga sektioner med ikoner och beskrivningar.
 */

import { cn } from "@/lib/utils";
import { 
  Activity, 
  AlertTriangle, 
  Bug, 
  Filter, 
  LayoutDashboard, 
  Settings,
  TrendingUp
} from "lucide-react";
import type { AnalyticsSection } from "@/pages/SystemAnalyticsPage";

interface AnalyticsNavigationProps {
  activeSection: AnalyticsSection;
  onSectionChange: (section: AnalyticsSection) => void;
}

const navigationItems: Array<{
  id: AnalyticsSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    id: 'overview',
    label: 'Översikt',
    icon: LayoutDashboard,
    description: 'KPIer och snabbvy'
  },
  {
    id: 'journey',
    label: 'Kundresa',
    icon: Filter,
    description: 'Funnel-analys'
  },
  {
    id: 'heatmap',
    label: 'Heatmap',
    icon: Activity,
    description: 'Avhoppspunkter'
  },
  {
    id: 'completion',
    label: 'Completion',
    icon: TrendingUp,
    description: 'Slutförandegrad'
  },
  {
    id: 'sent-analysis',
    label: 'Sent Status',
    icon: AlertTriangle,
    description: 'Gamla formulär'
  },
  {
    id: 'debug',
    label: 'Felsökning',
    icon: Bug,
    description: 'Session-debug'
  },
  {
    id: 'system',
    label: 'System',
    icon: Settings,
    description: 'AI-prompter'
  }
];

export const AnalyticsNavigation = ({ 
  activeSection, 
  onSectionChange 
}: AnalyticsNavigationProps) => {
  return (
    <nav className="flex flex-wrap gap-2 p-1 bg-muted/50 rounded-xl">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200",
              "text-sm font-medium",
              "hover:bg-background/80",
              isActive 
                ? "bg-background shadow-sm text-primary" 
                : "text-muted-foreground"
            )}
          >
            <Icon className={cn(
              "h-4 w-4",
              isActive ? "text-primary" : "text-muted-foreground"
            )} />
            <span className="hidden sm:inline">{item.label}</span>
            <span className="hidden lg:inline text-xs text-muted-foreground">
              · {item.description}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
