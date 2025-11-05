
/**
 * This component renders the application's navigation bar at the top of the screen.
 * It displays the organization switcher, the user's first name, and the user button
 * that allows for account management and sign out functionality.
 */

import { UserButton, OrganizationSwitcher } from "@clerk/clerk-react";
import { useSafeAuth as useAuth } from "@/hooks/useSafeAuth";
import { useSafeUser as useUser } from "@/hooks/useSafeUser";
import { User } from "lucide-react";
import { StoreSelector } from "@/components/StoreSelector/StoreSelector";

const Navbar = () => {
  const { userId } = useAuth();
  const { user } = useUser();
  const firstName = user?.firstName || "";

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        {/* Left side - Store selector */}
        <div className="flex items-center gap-4">
          <StoreSelector />
        </div>

        {/* Right side - Org switcher and user */}
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
