/**
 * KioskSetupPage - Dedikerad sida för att hantera kiosk-läge QR-koder
 * 
 * Denna sida ger en enkel och intuitiv vy för optiker att generera QR-koder
 * som patienter kan scanna för att fylla i formulär i kioskläge. Sidan visar
 * en stor QR-kod med tydliga instruktioner och möjlighet att enkelt generera
 * nya koder.
 * 
 * Huvudfunktioner:
 * - Stor, tydlig QR-kod display (400x400px)
 * - Enkel generering av nya kiosk-sessioner
 * - Toggle för handledarkod-krav
 * - Automatisk uppdatering efter formulärinlämning (framtida feature)
 * - Fullskärmsläge för receptionsdisplay
 */

import { useState } from "react";
import { useSafeOrganization } from "@/hooks/useSafeOrganization";
import { useSafeUser } from "@/hooks/useSafeUser";
import { useSafeAuth } from "@/hooks/useSafeAuth";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useFormTemplate } from "@/hooks/useFormTemplate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Loader2, Maximize2, RefreshCw, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function KioskSetupPage() {
  const { organization } = useSafeOrganization();
  const { user } = useSafeUser();
  const { userId } = useSafeAuth();
  const { supabase } = useSupabaseClient();
  const { data: formTemplate, isLoading: isLoadingTemplate } = useFormTemplate();
  
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [requireSupervisorCode, setRequireSupervisorCode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const creatorName = user?.fullName || user?.id || "Kiosk";

  const handleGenerateQR = async () => {
    if (!organization?.id || !formTemplate) {
      toast({
        title: "Fel",
        description: "Organisation eller formulärmall saknas",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const accessToken = crypto.randomUUID();
      const expiryHours = 24; // Kiosk mode always 24h

      const { data, error } = await supabase
        .from("anamnes_entries")
        .insert({
          organization_id: organization.id,
          access_token: accessToken,
          status: "sent",
          expires_at: new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString(),
          form_id: formTemplate.id,
          patient_identifier: "Kiosk-patient",
          created_by: userId || null,
          created_by_name: creatorName,
          sent_at: new Date().toISOString(),
          optician_id: userId || null,
          is_kiosk_mode: true,
          require_supervisor_code: requireSupervisorCode
        })
        .select()
        .single();

      if (error) throw error;

      // Get the correct public URL - avoid internal Lovable URLs
      const getPublicUrl = () => {
        const hostname = window.location.hostname;
        
        // If it's an internal lovableproject.com URL, use the production lovable.app domain
        if (hostname.includes('lovableproject.com')) {
          // Extract project ID from hostname if possible, or use the deployed URL
          return window.location.origin.replace('lovableproject.com', 'lovable.app');
        }
        
        // Otherwise use the current origin (works for custom domains and deployed apps)
        return window.location.origin;
      };
      
      const baseUrl = getPublicUrl();
      const codeParam = requireSupervisorCode ? "&code=required" : "";
      const fullUrl = `${baseUrl}/kiosk-form?token=${accessToken}${codeParam}`;

      setGeneratedUrl(fullUrl);

      toast({
        title: "QR-kod genererad",
        description: "Patienter kan nu scanna koden för att öppna formuläret"
      });
    } catch (error: any) {
      console.error("Error generating kiosk QR:", error);
      toast({
        title: "Fel vid generering",
        description: error.message || "Kunde inte generera QR-kod",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
      toast({ 
        title: "Kopierad!", 
        description: "Länken har kopierats till urklipp" 
      });
    }
  };

  if (isLoadingTemplate) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!formTemplate) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Ingen formulärmall hittades för din organisation. Kontakta administratör.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Kiosk-läge</h1>
        <p className="text-muted-foreground">
          Generera en QR-kod som patienter kan scanna för att fylla i formulär på sin egen enhet
        </p>
      </div>

      <div className="grid gap-6">
        {/* QR Code Display Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-6 w-6" />
              QR-kod för patientformulär
            </CardTitle>
            <CardDescription>
              Giltighet: 24 timmar från generering
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {generatedUrl ? (
              <>
                <div className="flex justify-center p-8 bg-background rounded-lg border-2">
                  <QRCodeSVG 
                    value={generatedUrl} 
                    size={400}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                
                <div className="text-center space-y-2">
                  <p className="font-semibold text-lg">
                    Scanna QR-koden med din telefon för att öppna formuläret
                  </p>
                  {requireSupervisorCode && (
                    <p className="text-sm text-muted-foreground">
                      ⚠️ Handledarkod krävs vid inskickning
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground break-all px-4">
                    {generatedUrl}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleCopyLink}
                  >
                    Kopiera länk
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handlePrint}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Skriv ut
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={toggleFullscreen}
                  >
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Helskärm
                  </Button>
                  <Button 
                    variant="default" 
                    className="flex-1"
                    onClick={handleGenerateQR}
                    disabled={isGenerating}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Ny QR-kod
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-6 py-8">
                <div className="flex justify-center">
                  <QrCode className="h-24 w-24 text-muted-foreground/30" />
                </div>
                <div>
                  <p className="text-lg font-medium mb-2">Ingen QR-kod genererad ännu</p>
                  <p className="text-sm text-muted-foreground">
                    Klicka på knappen nedan för att skapa en ny kiosk-session
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle>Inställningar</CardTitle>
            <CardDescription>
              Anpassa kiosk-sessionen efter dina behov
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="requireCode" 
                checked={requireSupervisorCode}
                onCheckedChange={(checked) => setRequireSupervisorCode(checked === true)}
              />
              <Label htmlFor="requireCode" className="cursor-pointer">
                Kräv handledarkod vid inskickning
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              När detta är aktiverat måste en handledare ange en PIN-kod innan formuläret kan skickas in.
            </p>

            {!generatedUrl && (
              <Button 
                onClick={handleGenerateQR}
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Genererar...
                  </>
                ) : (
                  <>
                    <QrCode className="h-5 w-5 mr-2" />
                    Generera QR-kod
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">💡 Tips för kiosk-läge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• QR-koden gäller i 24 timmar från skapandet</p>
            <p>• Patienter kan scanna koden med sin telefon eller surfplatta</p>
            <p>• Använd helskärmsläge för att visa QR-koden på en dedikerad skärm i väntrummet</p>
            <p>• Skriv ut QR-koden för att placera vid receptionen</p>
            <p>• Generera en ny QR-kod för varje ny patient eller session</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
