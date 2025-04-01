
import { Link } from "react-router-dom";
import { UserButton, useAuth, useOrganization } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const { has } = useAuth();
  const { organization, isLoaded } = useOrganization();

  // Use orgId instead of organization.id in the has method
  const isAdmin = organization?.id ? has({ role: "org:admin", org_id: organization.id }) : false;

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <div className="flex items-center">
          <Link to="/" className="text-2xl font-bold text-primary">
            Anamnesportalen
          </Link>
        </div>

        <nav className="flex items-center space-x-4">
          <Link to="/dashboard" className="text-sm font-medium hover:text-primary">
            Dashboard
          </Link>
          
          {isAdmin && (
            <Link to="/admin" className="text-sm font-medium hover:text-primary">
              Admin
            </Link>
          )}
          
          <UserButton afterSignOutUrl="/" />
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
