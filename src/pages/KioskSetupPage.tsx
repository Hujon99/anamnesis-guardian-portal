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
import { useKioskSession } from "@/hooks/useKioskSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Loader2, Maximize2, RefreshCw, Printer, Activity, Clock, Check, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";

export default function KioskSetupPage() {
  const { organization } = useSafeOrganization();
  const { user } = useSafeUser();
  const { userId } = useSafeAuth();
  const { supabase } = useSupabaseClient();
  const { data: formTemplate, isLoading: isLoadingTemplate } = useFormTemplate();
  const { createKioskSession } = useKioskSession();
  
  const [kioskMode, setKioskMode] = useState<"single-use" | "reusable">("reusable");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [requireSupervisorCode, setRequireSupervisorCode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const creatorName = user?.fullName || user?.id || "Kiosk";

  // Get the correct public URL - avoid internal Lovable URLs
  const getPublicUrl = () => {
    const hostname = window.location.hostname;
    
    if (hostname.includes('lovableproject.com')) {
      return window.location.origin.replace('lovableproject.com', 'lovable.app');
    }
    
    return window.location.origin;
  };

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
      if (kioskMode === "reusable") {
        // Create reusable kiosk session
        const session = await createKioskSession({
          formId: formTemplate.id,
          requireSupervisorCode,
        });

        if (!session) {
          throw new Error("Kunde inte skapa kiosk-session");
        }

        setCurrentSessionId(session.id);
        const baseUrl = getPublicUrl();
        const fullUrl = `${baseUrl}/kiosk?session=${session.persistent_token}`;
        setGeneratedUrl(fullUrl);

        toast({
          title: "Återanvändbar kiosk-session skapad",
          description: "Samma QR-kod kan användas av flera patienter"
        });

      } else {
        // Create single-use entry (old behavior)
        const accessToken = crypto.randomUUID();
        const expiryHours = 24;

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

        const baseUrl = getPublicUrl();
        const codeParam = requireSupervisorCode ? "&code=required" : "";
        const fullUrl = `${baseUrl}/kiosk-form?token=${accessToken}${codeParam}`;
        setGeneratedUrl(fullUrl);

        toast({
          title: "Engångs-QR-kod genererad",
          description: "Denna QR-kod kan användas en gång"
        });
      }

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
      setCopied(true);
      toast({ 
        title: "Kopierad!", 
        description: "Länken har kopierats till urklipp" 
      });
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
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

      {/* Important Notice */}
      <Alert className="mb-6 border-accent-teal bg-accent-teal/5">
        <AlertDescription className="text-sm">
          <strong>ℹ️ Viktigt:</strong> Kiosk-läget fungerar för närvarande endast med CISS-formuläret. 
          Om din organisation använder andra formulärtyper (t.ex. körkortsundersökningar), kan dessa inte 
          användas i kiosk-läge ännu. Vi arbetar på att utöka funktionaliteten framöver.
        </AlertDescription>
      </Alert>

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
                
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant={kioskMode === "reusable" ? "default" : "secondary"}>
                      {kioskMode === "reusable" ? (
                        <>
                          <Activity className="h-3 w-3 mr-1" />
                          Återanvändbar session
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          Engångs-token
                        </>
                      )}
                    </Badge>
                  </div>
                  
                  <p className="font-semibold text-lg">
                    Scanna QR-koden med din telefon för att öppna formuläret
                  </p>
                  
                  {kioskMode === "reusable" && (
                    <p className="text-sm text-accent-teal font-medium">
                      ♻️ Denna QR-kod kan användas av flera patienter
                    </p>
                  )}
                  
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
                    variant={copied ? "default" : "outline"}
                    className="flex-1 transition-all duration-300"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Kopierad!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Kopiera länk
                      </>
                    )}
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
          <CardContent className="space-y-6">
            {/* Kiosk Mode Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Kiosk-läge</Label>
              <RadioGroup value={kioskMode} onValueChange={(value) => setKioskMode(value as any)}>
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="reusable" id="reusable" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="reusable" className="cursor-pointer font-medium">
                      Återanvändbar kiosk-session
                      <Badge variant="default" className="ml-2">Rekommenderas</Badge>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      En QR-kod som kan scannas av flera patienter. Efter inskickning återgår formuläret automatiskt till startsidan.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="single-use" id="single-use" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="single-use" className="cursor-pointer font-medium">
                      Engångs-token
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      QR-koden kan endast användas en gång. En ny QR-kod måste genereras för varje patient.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Supervisor Code Checkbox */}
            <div className="space-y-2">
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
              <p className="text-sm text-muted-foreground pl-6">
                När detta är aktiverat måste en handledare ange en PIN-kod innan formuläret kan skickas in.
              </p>
            </div>

            {/* Generate Button */}
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
                    {kioskMode === "reusable" ? "Skapa kiosk-session" : "Generera QR-kod"}
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
            {kioskMode === "reusable" ? (
              <>
                <p>• <strong>Återanvändbar session:</strong> Samma QR-kod används av alla patienter</p>
                <p>• Efter inskickning återgår formuläret automatiskt till startsidan</p>
                <p>• Perfekt för en dedikerad iPad/surfplatta i väntrummet</p>
                <p>• Ingen manuell återställning behövs mellan patienter</p>
              </>
            ) : (
              <>
                <p>• <strong>Engångs-token:</strong> QR-koden gäller för en patient</p>
                <p>• Generera en ny QR-kod för varje ny patient</p>
                <p>• QR-koden gäller i 24 timmar från skapandet</p>
                <p>• Bra för enskilda patienter som scannar med sin egen telefon</p>
                <p>• Skriv ut QR-koden för att placera vid receptionen</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
