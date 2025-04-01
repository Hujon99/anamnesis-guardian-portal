
import { useState } from "react";
import { useUser, useOrganization } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { User, Users, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";

interface OrgUser {
  id: string;
  clerk_user_id: string;
  organization_id: string;
  role: string;
  email?: string;
  name?: string;
}

const AdminPanel = () => {
  const { user } = useUser();
  const { organization } = useOrganization();
  const [activeTab, setActiveTab] = useState("users");
  const { supabase, isLoading: supabaseLoading, error: supabaseError } = useSupabaseClient();

  // Query to fetch organization users
  const { data: orgUsers = [], isLoading } = useQuery({
    queryKey: ["orgUsers"],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("organization_id", organization?.id);

      if (error) {
        console.error("Error fetching users:", error);
        toast({
          title: "Fel vid hämtning av användare",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }

      // For this demo, we'll add mock user details
      // In a real app, you'd fetch user details from Clerk's API
      return data.map((user: OrgUser) => ({
        ...user,
        email: `user-${user.id.substring(0, 4)}@example.com`,
        name: `User ${user.id.substring(0, 4)}`,
      })) as OrgUser[];
    },
    enabled: !!user && !!organization && !supabaseLoading,
  });

  if (!organization) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold mb-4">Du måste tillhöra en organisation</h2>
        <p className="text-gray-600 mb-6">
          Kontakta din administratör för att bli tillagd i en organisation.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Administration</h1>
          <p className="text-gray-600">
            Organisation: {organization?.name}
          </p>
        </div>
      </div>

      {supabaseError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Fel vid anslutning till Supabase</AlertTitle>
          <AlertDescription>
            {supabaseError.message}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Användare
          </TabsTrigger>
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Organisationsinställningar
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Organisationsanvändare
              </CardTitle>
              <CardDescription>
                Hantera användare i din organisation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {supabaseLoading || isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : orgUsers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Inga användare hittades</p>
                </div>
              ) : (
                <div className="divide-y">
                  {orgUsers.map((user) => (
                    <div key={user.id} className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{user.name}</h3>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.role === "org:admin" 
                            ? "bg-blue-100 text-blue-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {user.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="organization" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Organisationsinställningar</CardTitle>
              <CardDescription>
                Hantera inställningar för {organization?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">
                Organisationsinställningar kommer snart...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
