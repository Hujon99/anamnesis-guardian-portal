
/**
 * This component renders breadcrumb navigation for the application.
 * It displays the current page location in a hierarchical context,
 * enhancing navigation awareness and providing quick links back to parent pages.
 */

import React from "react";
import { useLocation } from "react-router-dom";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

interface BreadcrumbRoute {
  label: string;
  path: string;
}

interface NavigationBreadcrumbsProps {
  className?: string;
}

export function NavigationBreadcrumbs({ className }: NavigationBreadcrumbsProps) {
  const location = useLocation();
  
  // Define paths and their corresponding labels
  const breadcrumbMap: Record<string, BreadcrumbRoute> = {
    "/": { label: "Hem", path: "/" },
    "/dashboard": { label: "Översikt", path: "/dashboard" },
    "/my-anamneses": { label: "Mina anamneser", path: "/my-anamneses" },
    "/admin": { label: "Administration", path: "/admin" },
    "/optician": { label: "Optikervy", path: "/optician" },
    "/optician-form": { label: "Optikerformulär", path: "/optician-form" },
  };
  
  // Create breadcrumbs based on current path
  const buildBreadcrumbs = () => {
    const breadcrumbs: BreadcrumbRoute[] = [];
    
    // Add home as first item
    breadcrumbs.push({ label: "Hem", path: "/" });
    
    // Handle special cases based on current location
    if (location.pathname === "/") {
      // Only show home for root path
      return breadcrumbs;
    } 
    
    const currentRoute = breadcrumbMap[location.pathname];
    if (currentRoute) {
      if (location.pathname !== "/") {
        // For main sections, add as leaf node
        breadcrumbs.push(currentRoute);
      }
    }
    
    return breadcrumbs;
  };
  
  const breadcrumbs = buildBreadcrumbs();
  
  // Don't render if there's only the home breadcrumb
  if (breadcrumbs.length <= 1 && location.pathname === "/") {
    return null;
  }
  
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.path}>
            <BreadcrumbItem>
              <BreadcrumbLink 
                to={crumb.path}
                isActive={index === breadcrumbs.length - 1}
              >
                {index === 0 ? (
                  <span className="flex items-center gap-1">
                    <Home className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:inline">{crumb.label}</span>
                  </span>
                ) : (
                  crumb.label
                )}
              </BreadcrumbLink>
            </BreadcrumbItem>
            
            {index < breadcrumbs.length - 1 && (
              <BreadcrumbSeparator />
            )}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
