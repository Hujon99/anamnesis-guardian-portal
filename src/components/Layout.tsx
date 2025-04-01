
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { useAuth } from "@clerk/clerk-react";

const Layout = () => {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return <div className="flex items-center justify-center min-h-screen">Laddar...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-6 px-4">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
