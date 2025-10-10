
/**
 * This component provides a layout specifically for forms that need to support
 * both authenticated opticians (with sidebar) and unauthenticated patients (clean layout).
 * Unlike the main Layout component, this doesn't enforce authentication redirects,
 * allowing the form content to handle its own access control logic.
 */

import { useAuth } from "@clerk/clerk-react";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { NavigationBreadcrumbs } from "./NavigationBreadcrumbs";
import Navbar from "./Navbar";

interface FormLayoutProps {
  children: React.ReactNode;
  cleanLayout?: boolean;
}

const FormLayout = ({ children, cleanLayout = false }: FormLayoutProps) => {
  // Safely attempt to use Clerk auth, but handle case where Clerk isn't loaded
  let isLoaded = true;
  let userId: string | null | undefined = null;
  
  try {
    const auth = useAuth();
    isLoaded = auth.isLoaded;
    userId = auth.userId;
  } catch (error) {
    // Clerk not available (token-based patient access)
    // This is expected and fine - just use defaults
    console.log("FormLayout: Clerk not available, using clean layout for token-based access");
  }

  // Show loading state while Clerk is initializing (only if Clerk is actually being used)
  if (!isLoaded && userId !== null) {
    return <div className="flex items-center justify-center min-h-screen">Laddar...</div>;
  }

  // If user is authenticated (optician), show sidebar layout (unless cleanLayout is requested)
  if (userId && !cleanLayout) {
    return (
      <SidebarProvider>
        <div className="flex w-full min-h-screen">
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-col min-h-full">
              <Navbar />
              <div className="p-4 sm:p-6 flex-grow">
                <div className="sidebar-trigger-container mb-4 flex items-center space-x-4">
                  <SidebarTrigger />
                  <NavigationBreadcrumbs className="hidden sm:flex" />
                </div>
                {children}
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  // For unauthenticated users (patients), show clean layout without sidebar
  return <div className="min-h-screen">{children}</div>;
};

export default FormLayout;
