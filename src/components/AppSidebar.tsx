
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
  LayoutDashboard
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
import { useOpticians } from "@/hooks/useOpticians";
import { useEffect, useState } from "react";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { Badge } from "@/components/ui/badge";

export function AppSidebar() {
  const { has } = useAuth();
  const { user } = useUser();
  const location = useLocation();
  const { supabase, isReady } = useSupabaseClient();
  
  // Check if current user is an optician
  const [isUserOptician, setIsUserOptician] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  
  useEffect(() => {
    const checkOpticianRole = async () => {
      if (!user || !isReady) return;
      
      try {
        setIsCheckingRole(true);
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('clerk_user_id', user.id)
          .single();
          
        setIsUserOptician(data?.role === 'optician');
      } catch (error) {
        console.error("Error checking optician role:", error);
        setIsUserOptician(false);
      } finally {
        setIsCheckingRole(false);
      }
    };
    
    checkOpticianRole();
  }, [user, isReady, supabase]);
  
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
                  tooltip="Översikt över alla anamneser"
                >
                  <Link to="/dashboard">
                    <LayoutDashboard />
                    <span>Översikt</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {isUserOptician && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === '/my-anamneses'}
                    tooltip="Mina tilldelade anamneser"
                  >
                    <Link to="/my-anamneses">
                      <User />
                      <span>Mina anamneser</span>
                      <Badge variant="outline" className="ml-auto">Personlig</Badge>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
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
