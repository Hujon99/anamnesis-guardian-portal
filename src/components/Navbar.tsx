
import { UserButton, OrganizationSwitcher } from "@clerk/clerk-react";

const Navbar = () => {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 flex items-center justify-end h-16">
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
      </div>
    </header>
  );
};

export default Navbar;
