
/**
 * This component renders the application's navigation bar at the top of the screen.
 * It displays the organization switcher, the user's first name, and the user button
 * that allows for account management and sign out functionality.
 * 
 * The navbar uses a full-width layout with store selector anchored to the left
 * and organization/user controls anchored to the right, following the Blue Pulse design system.
 */

import { UserButton, OrganizationSwitcher } from "@clerk/clerk-react";
import { useSafeAuth as useAuth } from "@/hooks/useSafeAuth";
import { useSafeUser as useUser } from "@/hooks/useSafeUser";
import { StoreSelector } from "@/components/StoreSelector/StoreSelector";

const Navbar = () => {
  const { userId } = useAuth();
  const { user } = useUser();
  const firstName = user?.firstName || "";

  // Clerk appearance configuration matching Blue Pulse design system
  const clerkAppearance = {
    variables: {
      colorPrimary: 'hsl(216 91% 37%)', // --primary from design system
      colorBackground: 'hsl(0 0% 100%)',
      colorText: 'hsl(0 0% 11%)',
      colorTextSecondary: 'hsl(215 17% 37%)',
      colorInputBackground: 'hsl(0 0% 100%)',
      colorInputText: 'hsl(0 0% 11%)',
      borderRadius: '0.75rem',
      fontFamily: 'inherit',
    },
    elements: {
      rootBox: {
        width: 'auto',
      },
      card: {
        backgroundColor: 'hsl(0 0% 100%)',
        boxShadow: '0 10px 30px -10px hsl(216 91% 37% / 0.2)',
        border: '1px solid hsl(214 32% 91%)',
      },
      organizationSwitcherTrigger: {
        padding: '0.5rem 0.75rem',
        border: '1px solid hsl(214 32% 91%)',
        borderRadius: '0.5rem',
        backgroundColor: 'hsl(0 0% 100%)',
        color: 'hsl(0 0% 11%)',
        fontSize: '0.875rem',
        fontWeight: '500',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: 'hsl(214 32% 96%)',
          borderColor: 'hsl(216 91% 37% / 0.4)',
        },
      },
      userButtonTrigger: {
        border: '1px solid hsl(214 32% 91%)',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'hsl(216 91% 37% / 0.4)',
        },
      },
      userButtonPopoverCard: {
        backgroundColor: 'hsl(0 0% 100%)',
        border: '1px solid hsl(214 32% 91%)',
      },
      organizationSwitcherPopoverCard: {
        backgroundColor: 'hsl(0 0% 100%)',
        border: '1px solid hsl(214 32% 91%)',
      },
      userPreview: {
        color: 'hsl(0 0% 11%)',
      },
      userButtonPopoverActionButton: {
        color: 'hsl(0 0% 11%)',
        '&:hover': {
          backgroundColor: 'hsl(214 32% 96%)',
        },
      },
      organizationPreview: {
        color: 'hsl(0 0% 11%)',
      },
      organizationSwitcherPopoverActionButton: {
        color: 'hsl(0 0% 11%)',
        '&:hover': {
          backgroundColor: 'hsl(214 32% 96%)',
        },
      },
    },
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Left side - Store selector, anchored to left edge */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <StoreSelector />
        </div>

        {/* Right side - Org switcher and user, anchored to right edge */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <OrganizationSwitcher 
            hidePersonal={true}
            appearance={clerkAppearance}
          />
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium hidden sm:inline-block text-foreground">
              {firstName}
            </span>
            <UserButton 
              afterSignOutUrl="/" 
              appearance={clerkAppearance}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
