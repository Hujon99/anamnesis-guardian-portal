/**
 * AI Prompts Manager Component
 * Allows administrators to customize AI system prompts for different examination types
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import { useOrganizationPrompts, DEFAULT_PROMPTS } from '@/hooks/useOrganizationPrompts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AIPromptsManagerProps {
  organizationId: string;
}

export const AIPromptsManager: React.FC<AIPromptsManagerProps> = ({ organizationId }) => {
  const { prompts, isLoading, updatePrompts, isUpdating } = useOrganizationPrompts(organizationId);
  const [generalPrompt, setGeneralPrompt] = useState('');
  const [drivingLicensePrompt, setDrivingLicensePrompt] = useState('');
  const [lensExaminationPrompt, setLensExaminationPrompt] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetType, setResetType] = useState<'general' | 'driving_license' | 'lens_examination' | null>(null);

  // Initialize form when prompts load
  React.useEffect(() => {
    if (prompts) {
      setGeneralPrompt(prompts.ai_prompt_general || '');
      setDrivingLicensePrompt(prompts.ai_prompt_driving_license || '');
      setLensExaminationPrompt(prompts.ai_prompt_lens_examination || '');
    }
  }, [prompts]);

  const handleSave = () => {
    updatePrompts({
      ai_prompt_general: generalPrompt,
      ai_prompt_driving_license: drivingLicensePrompt,
      ai_prompt_lens_examination: lensExaminationPrompt
    });
  };

  const handleReset = (type: 'general' | 'driving_license' | 'lens_examination') => {
    setResetType(type);
    setResetDialogOpen(true);
  };

  const confirmReset = () => {
    if (resetType === 'general') {
      setGeneralPrompt(DEFAULT_PROMPTS.general);
    } else if (resetType === 'driving_license') {
      setDrivingLicensePrompt(DEFAULT_PROMPTS.driving_license);
    } else if (resetType === 'lens_examination') {
      setLensExaminationPrompt(DEFAULT_PROMPTS.lens_examination);
    }
    setResetDialogOpen(false);
    setResetType(null);
  };

  const hasChanges = prompts && (
    generalPrompt !== prompts.ai_prompt_general ||
    drivingLicensePrompt !== prompts.ai_prompt_driving_license ||
    lensExaminationPrompt !== prompts.ai_prompt_lens_examination
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Laddar AI-promptar...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>AI-promptar</CardTitle>
          <CardDescription>
            Anpassa de system-promptar som styr hur AI:n sammanfattar anamneser för olika undersökningstyper
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">Allmän</TabsTrigger>
              <TabsTrigger value="driving_license">Körkort</TabsTrigger>
              <TabsTrigger value="lens_examination">Linser</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="general-prompt">Allmän undersökning</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReset('general')}
                    disabled={isUpdating}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Återställ
                  </Button>
                </div>
                <Textarea
                  id="general-prompt"
                  value={generalPrompt}
                  onChange={(e) => setGeneralPrompt(e.target.value)}
                  placeholder="Skriv system-prompt för allmänna undersökningar..."
                  className="min-h-[200px] font-mono text-sm"
                  disabled={isUpdating}
                />
              </div>
            </TabsContent>

            <TabsContent value="driving_license" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="driving-license-prompt">Körkortsundersökning</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReset('driving_license')}
                    disabled={isUpdating}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Återställ
                  </Button>
                </div>
                <Textarea
                  id="driving-license-prompt"
                  value={drivingLicensePrompt}
                  onChange={(e) => setDrivingLicensePrompt(e.target.value)}
                  placeholder="Skriv system-prompt för körkortsundersökningar..."
                  className="min-h-[200px] font-mono text-sm"
                  disabled={isUpdating}
                />
              </div>
            </TabsContent>

            <TabsContent value="lens_examination" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="lens-examination-prompt">Linsundersökning</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReset('lens_examination')}
                    disabled={isUpdating}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Återställ
                  </Button>
                </div>
                <Textarea
                  id="lens-examination-prompt"
                  value={lensExaminationPrompt}
                  onChange={(e) => setLensExaminationPrompt(e.target.value)}
                  placeholder="Skriv system-prompt för linsundersökningar..."
                  className="min-h-[200px] font-mono text-sm"
                  disabled={isUpdating}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sparar...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Spara ändringar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Återställ till standard?</AlertDialogTitle>
            <AlertDialogDescription>
              Detta kommer att återställa prompten till standardinställningen. Du måste sedan spara för att applicera ändringen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset}>Återställ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
