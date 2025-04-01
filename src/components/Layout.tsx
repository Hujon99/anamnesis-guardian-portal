
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { useAuth, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const { isLoaded, userId } = useAuth();

  if (!isLoaded) {
    return <div className="flex items-center justify-center min-h-screen">Laddar...</div>;
  }

  if (!userId) {
    return <RedirectToSignIn />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-6 px-4">
        {children || <Outlet />}
      </main>
    </div>
  );
};

export default Layout;
