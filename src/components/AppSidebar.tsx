
/**
 * This component renders the application's sidebar navigation.
 * It displays different menu items based on the user's role and authentication status.
 * The navigation includes links to the Overview (all anamneses) and My Anamneses views.
 */

import { useAuth, useUser } from "@clerk/clerk-react";
import { Link, useLocation } from "react-router-dom";
import { 
  ClipboardList, 
  Home, 
  Settings, 
  Users,
  User,
  LayoutDashboard,
  Clipboard
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { FeedbackButton } from "@/components/Feedback/FeedbackButton";
import { useUserRole } from "@/hooks/useUserRole";
import { RestartTourButton } from "@/components/Onboarding/RestartTourButton";

export function AppSidebar() {
  const { has, userId } = useAuth();
  const { user } = useUser();
  const location = useLocation();
  const { role, isAdmin, isOptician } = useUserRole();
  
  // Check organization roles from Clerk
  const isClerkAdmin = has({ role: "org:admin" });
  
  // Determine if user can access optician features (optician or admin role)
  const canAccessOpticianFeatures = isAdmin || isOptician;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border">
        <div className="flex items-center justify-between px-3 py-3">
          <h2 className="text-lg font-bold text-primary group-data-[collapsible=icon]:hidden">
            Anamnesportalen
          </h2>
          <SidebarTrigger className="-mr-1" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location.pathname === '/dashboard'}
                  tooltip="Översikt över alla anamneser"
                >
                  <Link to="/dashboard">
                    <LayoutDashboard />
                    <span>Översikt</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {canAccessOpticianFeatures && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === '/my-anamneses'}
                    tooltip="Mina tilldelade anamneser"
                    data-tour="my-anamnesis"
                  >
                    <Link to="/my-anamneses" className="relative">
                      <Clipboard />
                      <span>Mina anamneser</span>
                      <Badge 
                        variant="outline" 
                        className="ml-auto bg-accent-1/10 text-accent-1 font-medium"
                      >
                        {isAdmin ? "Admin" : "Personlig"}
                      </Badge>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {(isAdmin || isClerkAdmin) && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === '/admin'}
                    data-tour="admin-panel"
                  >
                    <Link to="/admin">
                      <Settings />
                      <span>Administration</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <div data-tour="feedback">
                <FeedbackButton />
              </div>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>Guide</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-2">
              <RestartTourButton variant="ghost" size="sm" />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground space-y-2">
          <div className="flex justify-center space-x-4">
            <Link to="/privacy-policy" className="hover:text-primary transition-colors">
              Integritetspolicy
            </Link>
            <Link to="/terms-of-service" className="hover:text-primary transition-colors">
              Användarvillkor
            </Link>
          </div>
          <div className="text-center">
            &copy; {new Date().getFullYear()} Anamnesportalen
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
