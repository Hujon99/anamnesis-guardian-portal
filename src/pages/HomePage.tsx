
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@clerk/clerk-react";

const HomePage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <div className="text-center max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
          Anamnesportalen
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Säker hantering av hälsouppgifter för optiker och deras patienter
        </p>
        
        <SignedIn>
          <Button asChild size="lg" className="mx-2">
            <Link to="/dashboard">Gå till Dashboard</Link>
          </Button>
        </SignedIn>
        
        <SignedOut>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" variant="default">
              <Link to="/sign-in">Logga in</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/sign-up">Skapa konto</Link>
            </Button>
          </div>
        </SignedOut>
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
    </div>
  );
};

const FeatureCard = ({ title, description }: { title: string; description: string }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h3 className="text-lg font-semibold mb-2 text-primary">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

export default HomePage;
