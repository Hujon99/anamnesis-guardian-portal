/**
 * Main component for conducting driving license examinations.
 * Provides a step-by-step guided interface for opticians to perform complete
 * driving license vision tests including visual acuity measurements, 
 * automatic warnings for values below limits, and mandatory ID verification.
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  IdCard,
  FileText,
  Car
} from "lucide-react";

import { AnamnesesEntry } from "@/types/anamnesis";
import { Database } from "@/integrations/supabase/types";
import { FormAnswersDisplay } from "./FormAnswersDisplay";
import { VisualAcuityMeasurement } from "./VisualAcuityMeasurement";
import { WarningsDisplay } from "./WarningsDisplay";
import { IdVerification } from "./IdVerification";
import { ExaminationSummary } from "./ExaminationSummary";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";

interface DrivingLicenseExaminationProps {
  entry: AnamnesesEntry;
  onClose: () => void;
  onUpdate: () => void;
}

type DrivingLicenseExamination = Database['public']['Tables']['driving_license_examinations']['Row'];

export const DrivingLicenseExamination: React.FC<DrivingLicenseExaminationProps> = ({
  entry,
  onClose,
  onUpdate
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [examination, setExamination] = useState<DrivingLicenseExamination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // Offline mode allows entering measurements even if DB insert is blocked by RLS
  const [offlineData, setOfflineData] = useState<Partial<DrivingLicenseExamination> | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Authenticated Supabase client (Clerk JWT) to satisfy RLS
  const { supabase: db, isReady, error: dbError } = useSupabaseClient();

  const steps = [
    { id: 1, title: "Legitimation", icon: IdCard },
    { id: 2, title: "Formuläröversikt", icon: FileText },
    { id: 3, title: "Visusmätningar", icon: Eye },
    { id: 4, title: "Varningar", icon: AlertTriangle },
    { id: 5, title: "Slutföra", icon: CheckCircle }
  ];

  // Load existing examination or create new one
  useEffect(() => {
    const loadExamination = async () => {
      try {
        if (!isReady || !db) {
          return; // Wait until authenticated client is ready
        }
        setIsLoading(true);
        console.log('[DrivingLicenseExamination] Loading examination for entry:', entry.id);
        
        const { data: existingExam, error } = await db
          .from('driving_license_examinations')
          .select('*')
          .eq('entry_id', entry.id)
          .single();

        console.log('[DrivingLicenseExamination] Query result:', { existingExam, error });

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (existingExam) {
          console.log('[DrivingLicenseExamination] Found existing examination:', existingExam);
          setExamination(existingExam);
          // Always start at step 1 (ID verification) to show status clearly
          setCurrentStep(1);
        } else {
          // Create new examination record
          console.log('[DrivingLicenseExamination] Creating new examination for entry:', entry.id);
          const newExamination = {
            entry_id: entry.id,
            organization_id: entry.organization_id,
            examination_status: 'in_progress' as const
          };

          const { data: created, error: createError } = await db
            .from('driving_license_examinations')
            .insert(newExamination)
            .select()
            .single();

          console.log('[DrivingLicenseExamination] Created examination:', { created, createError });

          if (createError) {
            console.warn('[DrivingLicenseExamination] Insert blocked or failed, switching to offline mode', createError);
            setIsOffline(true);
            setOfflineData({
              entry_id: entry.id,
              organization_id: entry.organization_id,
              examination_status: 'in_progress' as const,
            });
            setCurrentStep(2);
          } else {
            setExamination(created);
            // Always start at step 1 (ID verification) to show status clearly
            setCurrentStep(1);
          }
        }
      } catch (error) {
        console.error('Error loading examination:', error);
        toast({
          title: "Fel vid laddning",
          description: "Kunde inte ladda körkortsundersökning",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadExamination();
  }, [entry.id, entry.organization_id, isReady, db]);

  const saveExamination = async (updates: Database['public']['Tables']['driving_license_examinations']['Update']) => {
    console.log('[DrivingLicenseExamination] saveExamination called with updates:', updates);
    if (updates.personal_number !== undefined) {
      console.log('[DrivingLicenseExamination] PERSONAL_NUMBER in updates:', updates.personal_number);
    }
    console.log('[DrivingLicenseExamination] Current state:', { 
      examination: examination?.id, 
      isOffline, 
      offlineData: !!offlineData,
      isReady,
      hasDb: !!db 
    });

    try {
      setIsSaving(true);

      if (!isReady || !db) {
        console.error('[DrivingLicenseExamination] Database not ready');
        throw new Error('Databasen är inte redo');
      }

      let result;
      let error;

      if (examination?.id) {
        // Update existing examination
        console.log('[DrivingLicenseExamination] Updating existing examination:', examination.id);
        const { data, error: updateError } = await db
          .from('driving_license_examinations')
          .update(updates)
          .eq('id', examination.id)
          .select()
          .single();
        
        result = data;
        error = updateError;
      } else {
        // Insert new examination
        console.log('[DrivingLicenseExamination] Inserting new examination');
        const payload = {
          entry_id: entry.id,
          organization_id: entry.organization_id,
          examination_status: 'in_progress' as const,
          ...updates,
        } as Database['public']['Tables']['driving_license_examinations']['Insert'];

        const { data, error: insertError } = await db
          .from('driving_license_examinations')
          .insert(payload)
          .select()
          .single();
        
        result = data;
        error = insertError;
      }

      console.log('[DrivingLicenseExamination] Operation result:', { result, error });

      if (error) {
        console.error('[DrivingLicenseExamination] Database operation failed:', error);
        throw new Error(`Databasfel: ${error.message}`);
      }

      if (result) {
        console.log('[DrivingLicenseExamination] Successfully saved to database');
        setExamination(result);
        setIsOffline(false);
        setOfflineData(null);
        
        // Refetch to ensure we have latest data
        try {
          const { data: refetched } = await db
            .from('driving_license_examinations')
            .select('*')
            .eq('entry_id', entry.id)
            .single();
          
          if (refetched) {
            setExamination(refetched);
            console.log('[DrivingLicenseExamination] Refetched examination data:', refetched);
          }
        } catch (refetchError) {
          console.warn('[DrivingLicenseExamination] Refetch failed, using operation result');
        }
        
        toast({ 
          title: 'Sparat', 
          description: 'Undersökningen har sparats i databasen',
          variant: 'default'
        });
        onUpdate();
      } else {
        throw new Error('Ingen data returnerades från databasen');
      }
    } catch (error: any) {
      console.error('[DrivingLicenseExamination] Error in saveExamination:', error);
      
      // Fallback to offline storage
      const fallbackPayload = {
        entry_id: entry.id,
        organization_id: entry.organization_id,
        examination_status: 'in_progress' as const,
        ...updates,
      };
      
      setIsOffline(true);
      setOfflineData((prev) => ({ ...(prev || {}), ...fallbackPayload }));
      
      toast({
        title: 'Kunde inte spara',
        description: `Fel: ${error.message || 'Okänt fel'}. Data sparad lokalt.`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const progress = (currentStep / steps.length) * 100;

  // Build an effective examination object so user can work offline
  const effectiveExam = {
    entry_id: entry.id,
    organization_id: entry.organization_id,
    examination_status: (examination?.examination_status ?? 'in_progress') as any,
    ...examination,
    ...(offlineData || {}),
  } as any;

  // Debug logging
  React.useEffect(() => {
    console.log('[DrivingLicenseExamination] Rendering step content - currentStep:', currentStep, 'examination:', examination, 'offline:', isOffline);
  }, [currentStep, examination, isOffline]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Car className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Körkortsundersökning</h1>
            <p className="text-muted-foreground">
              {entry.first_name} • {entry.booking_date ? new Date(entry.booking_date).toLocaleDateString('sv-SE') : 'Direkt undersökning'}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={onClose}>
          Stäng
        </Button>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Steg {currentStep} av {steps.length}</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}% klart</span>
            </div>
            <Progress value={progress} className="h-2" />
            
            {/* Step indicators */}
            <div className="flex justify-between">
              {steps.map((step) => {
                const StepIcon = step.icon;
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                
                return (
                  <div 
                    key={step.id}
                    className={`flex flex-col items-center space-y-1 ${
                      isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                    }`}
                  >
                    <div className={`p-2 rounded-full ${
                      isActive ? 'bg-primary text-primary-foreground' : 
                      isCompleted ? 'bg-green-100 text-green-600' : 'bg-muted'
                    }`}>
                      <StepIcon className="h-4 w-4" />
                    </div>
                    <span className="text-xs text-center">{step.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {currentStep === 1 && (
            <IdVerification
              examination={effectiveExam}
              entry={entry}
              onSave={saveExamination}
              onNext={() => setCurrentStep(2)}
              isSaving={isSaving}
            />
          )}

          {currentStep === 2 && (
            <FormAnswersDisplay 
              entry={entry}
              onNext={() => setCurrentStep(3)}
            />
          )}
          
          {currentStep === 3 && (
            <VisualAcuityMeasurement
              examination={effectiveExam}
              entry={entry}
              onSave={saveExamination}
              onNext={() => setCurrentStep(4)}
              isSaving={isSaving}
            />
          )}
          
          {currentStep === 4 && (
            <WarningsDisplay
              examination={effectiveExam}
              entry={entry}
              onNext={() => setCurrentStep(5)}
            />
          )}
          
          {currentStep === 5 && (
            <ExaminationSummary
              examination={effectiveExam}
              entry={entry}
              onSave={saveExamination}
              onComplete={onClose}
              isSaving={isSaving}
            />
          )}
        </div>

        {/* Sidebar with quick info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Snabbinfo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={examination?.examination_status === 'completed' ? 'default' : 'secondary'}>
                  {examination?.examination_status === 'completed' ? 'Klar' : 'Pågår'}
                </Badge>
              </div>
              
              {examination?.vision_below_limit && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Visus under gräns
                  </AlertDescription>
                </Alert>
              )}
              
              {examination?.requires_further_investigation && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Kräver vidare utredning
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};