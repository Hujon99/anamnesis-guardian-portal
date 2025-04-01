
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { useAuth, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const { isLoaded, userId } = useAuth();

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
              <div className="sidebar-trigger-container mb-4">
                <SidebarTrigger />
              </div>
              {children || <Outlet />}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
