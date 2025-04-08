
/**
 * This component renders the application's sidebar navigation.
 * It displays different menu items based on the user's role and authentication status.
 * The navigation is now more intuitive with the overview showing the anamnesis list directly.
 */

import { useAuth } from "@clerk/clerk-react";
import { Link, useLocation } from "react-router-dom";
import { 
  ClipboardList, 
  Home, 
  Settings, 
  Users 
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
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { has } = useAuth();
  const location = useLocation();
  
  // Check user roles
  const isAdmin = has({ role: "org:admin" });
  const isMember = has({ role: "org:member" }) || isAdmin;

  return (
    <Sidebar>
      <SidebarHeader className="py-4">
        <div className="flex items-center justify-center px-2">
          <h2 className="text-xl font-bold text-primary">Anamnesportalen</h2>
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
                >
                  <Link to="/dashboard">
                    <Home />
                    <span>Översikt</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === '/admin'}
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
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground text-center">
          &copy; {new Date().getFullYear()} Anamnesportalen
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
