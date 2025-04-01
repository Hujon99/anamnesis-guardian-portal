
import { Link } from "react-router-dom";
import { UserButton, useAuth, useOrganization, OrganizationSwitcher } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const { has } = useAuth();
  const { organization, isLoaded } = useOrganization();

  // Check if user has admin role in the current organization
  const isAdmin = organization?.id ? has({ role: "org:admin" }) : false;

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
          
          <div className="flex items-center gap-2">
            <OrganizationSwitcher 
              hidePersonal={true}
              appearance={{
                elements: {
                  rootBox: "w-[200px]",
                  organizationSwitcherTrigger: "px-2 py-1 border rounded-md"
                }
              }}
            />
            <UserButton afterSignOutUrl="/" />
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
