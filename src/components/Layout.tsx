
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import { SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { useSafeAuth as useAuth } from "@/hooks/useSafeAuth";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useEffect } from "react";

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const { isLoaded, userId } = useAuth();
  const location = useLocation();
  const { handleJwtError } = useSupabaseClient();

  // Proactively refresh token on route changes
  useEffect(() => {
    if (userId) {
      handleJwtError();
    }
  }, [location.pathname, userId, handleJwtError]);

  // Refresh token when window gains focus
  useEffect(() => {
    if (!userId) return;

    const handleFocus = () => {
      handleJwtError();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleJwtError();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId, handleJwtError]);

  if (!isLoaded) {
    return <div className="flex items-center justify-center min-h-screen">Laddar...</div>;
  }

  if (!userId) {
    return <RedirectToSignIn />;
  }

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-col min-h-full">
            <Navbar />
            <div className="p-4 sm:p-6 flex-grow">
              {children || <Outlet />}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
