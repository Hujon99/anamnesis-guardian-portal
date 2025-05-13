
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
} from "@/components/ui/sidebar";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

export function AppSidebar() {
  const { has, userId } = useAuth();
  const { user } = useUser();
  const location = useLocation();
  const { supabase, isReady } = useSupabaseClient();
  
  // Check if current user has optician role
  const [isUserOptician, setIsUserOptician] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  
  // Check organization roles
  const isAdmin = has({ role: "org:admin" });
  const isMember = has({ role: "org:member" }) || isAdmin;

  useEffect(() => {
    const checkOpticianRole = async () => {
      if (!userId || !isReady) return;
      
      try {
        setIsCheckingRole(true);
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('clerk_user_id', userId)
          .single();
          
        if (error) {
          console.error("Error checking optician role:", error);
          return;
        }
        
        setIsUserOptician(data?.role === 'optician');
        
        // User is marked as optician but doesn't have the necessary Clerk role
        if (data?.role === 'optician' && !isAdmin && !isMember) {
          console.warn("User has optician role in database but not in Clerk");
        }
      } catch (error) {
        console.error("Error checking optician role:", error);
      } finally {
        setIsCheckingRole(false);
      }
    };
    
    checkOpticianRole();
  }, [userId, isReady, supabase, isAdmin, isMember]);

  // Determine if user can access optician features (optician role OR admin)
  const canAccessOpticianFeatures = isUserOptician || isAdmin;

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
              
              {canAccessOpticianFeatures && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === '/my-anamneses'}
                    tooltip="Mina tilldelade anamneser"
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
