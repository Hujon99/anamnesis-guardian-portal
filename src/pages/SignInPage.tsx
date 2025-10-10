import { SignIn } from "@clerk/clerk-react";
import { Logo } from "@/components/Logo";

const SignInPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="lg" className="mb-4 flex justify-center" />
          <h2 className="text-2xl font-semibold mb-2">Välkommen tillbaka</h2>
          <p className="text-muted-foreground">Logga in för att fortsätta</p>
        </div>
        
        <SignIn 
          routing="hash"
          signUpUrl="/sign-up"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-xl",
              headerTitle: "text-primary text-xl",
              headerSubtitle: "text-gray-500",
              formButtonPrimary: "bg-primary hover:bg-primary/90",
            }
          }}
        />
      </div>
    </div>
  );
};

export default SignInPage;
