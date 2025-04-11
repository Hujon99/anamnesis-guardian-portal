
/**
 * This component renders the application's navigation bar at the top of the screen.
 * It displays the organization switcher, the user's first name, and the user button
 * that allows for account management and sign out functionality.
 */

import { UserButton, OrganizationSwitcher, useAuth } from "@clerk/clerk-react";
import { User } from "lucide-react";

const Navbar = () => {
  const { sessionClaims } = useAuth();
  const firstName = sessionClaims?.first_name as string || "";

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 flex items-center justify-end h-16">
        <div className="flex items-center gap-4">
          <OrganizationSwitcher 
            hidePersonal={true}
            appearance={{
              elements: {
                rootBox: "w-[200px]",
                organizationSwitcherTrigger: "px-2 py-1 border rounded-md"
              }
            }}
          />
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium hidden sm:inline-block">
              {firstName}
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
