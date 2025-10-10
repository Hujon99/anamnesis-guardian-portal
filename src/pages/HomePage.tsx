
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { Logo } from "@/components/Logo";

const HomePage = () => {
  return (
    <>
      <SignedIn>
        <Navigate to="/dashboard" replace />
      </SignedIn>
      
      <SignedOut>
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
          <div className="text-center max-w-3xl">
            <div className="mb-6 flex justify-center">
              <Logo size="lg" />
            </div>
            <p className="text-xl text-gray-600 mb-8">
              Säker hantering av hälsouppgifter för optiker och deras patienter
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" variant="default">
                <Link to="/sign-in">Logga in</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/sign-up">Skapa konto</Link>
              </Button>
            </div>
          </div>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
            <FeatureCard 
              title="Säker insamling" 
              description="Samla in patientinformation säkert före besöket" 
            />
            <FeatureCard 
              title="Organisationshantering" 
              description="Hantera din optikerverksamhet med rollbaserad åtkomst" 
            />
            <FeatureCard 
              title="GDPR-vänlig" 
              description="Automatisk radering av uppgifter efter 48 timmar" 
            />
          </div>
          
          <footer className="mt-20 pb-8 text-center">
            <div className="flex justify-center space-x-6 text-sm text-gray-600">
              <Link to="/privacy-policy" className="hover:text-primary transition-colors">
                Integritetspolicy
              </Link>
              <Link to="/terms-of-service" className="hover:text-primary transition-colors">
                Användarvillkor
              </Link>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              &copy; {new Date().getFullYear()} Anamnesportalen
            </div>
          </footer>
        </div>
      </SignedOut>
    </>
  );
};

const FeatureCard = ({ title, description }: { title: string; description: string }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h3 className="text-lg font-semibold mb-2 text-primary">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

export default HomePage;
