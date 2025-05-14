
/**
 * This component handles the display of different tabs in the anamnesis detail modal.
 * It includes tabs for answers, raw data, patient info, and assignments.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntryAnswers } from "./EntryAnswers";
import { OptimizedAnswersView } from "./OptimizedAnswersView";
import { PatientInfo } from "./PatientInfo";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Edit, Save } from "lucide-react";
import { BookingInfoPanel } from "./BookingInfoPanel";
import { AssignmentSection } from "./AssignmentSection";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnamnesesEntry } from "@/types/anamnesis";

interface ModalTabContentProps {
  patientIdentifier: string;
  isEditing: boolean;
  toggleEditing: () => void;
  setPatientIdentifier: (value: string) => void;
  savePatientIdentifier: () => Promise<void>;
  formattedRawData: string;
  setFormattedRawData: (value: string) => void;
  saveFormattedRawData: () => Promise<void>;
  isPending: boolean;
  answers: Record<string, any>;
  hasAnswers: boolean;
  status: string;
  showPatientInfoSection: boolean;
  entry: AnamnesesEntry;
  onSaveAiSummary: (summary: string) => Promise<void>;
  onAssignOptician: (opticianId: string | null) => Promise<void>;
  onAssignStore: (storeId: string | null) => Promise<void>;
}

export function ModalTabContent({
  patientIdentifier,
  isEditing,
  toggleEditing,
  setPatientIdentifier,
  savePatientIdentifier,
  formattedRawData,
  setFormattedRawData,
  saveFormattedRawData,
  isPending,
  answers,
  hasAnswers,
  status,
  showPatientInfoSection,
  entry,
  onSaveAiSummary,
  onAssignOptician,
  onAssignStore
}: ModalTabContentProps) {
  return (
    <Tabs defaultValue="answers" className="w-full h-full flex flex-col">
      <TabsList className="mb-4 grid grid-cols-4">
        <TabsTrigger value="answers">Svar</TabsTrigger>
        <TabsTrigger value="rawdata">Rådata</TabsTrigger>
        <TabsTrigger value="patientinfo">Patient</TabsTrigger>
        <TabsTrigger value="assignments">Tilldelningar</TabsTrigger>
      </TabsList>

      <ScrollArea className="flex-1 h-full overflow-y-auto pr-4">
        <TabsContent value="answers" className="space-y-4 mt-0">
          {/* Show booking info if this is a magic link entry */}
          {(entry.is_magic_link || entry.booking_id || entry.store_id || entry.first_name || entry.booking_date) && (
            <BookingInfoPanel 
              entry={entry} 
              onAssignStore={onAssignStore}
            />
          )}
          
          {hasAnswers ? (
            <OptimizedAnswersView
              answers={answers}
              formattedRawData={formattedRawData}
              status={status}
              onSaveFormattedRawData={saveFormattedRawData}
              onSaveAiSummary={onSaveAiSummary}
              aiSummary={entry.ai_summary || ""}
            />
          ) : (
            <EntryAnswers
              answers={answers}
            />
          )}
        </TabsContent>

        <TabsContent value="rawdata" className="mt-0">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Rådataformat</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleEditing}
                disabled={isPending}
              >
                {isEditing ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Spara
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Redigera
                  </>
                )}
              </Button>
            </div>
            <Textarea
              value={formattedRawData}
              onChange={(e) => setFormattedRawData(e.target.value)}
              disabled={!isEditing || isPending}
              className="font-mono text-sm h-[50vh]"
            />
            {isEditing && (
              <div className="flex justify-end">
                <Button
                  onClick={saveFormattedRawData}
                  disabled={isPending}
                  className="w-24"
                >
                  Spara
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="patientinfo" className="mt-0">
          {showPatientInfoSection && (
            <PatientInfo
              patientIdentifier={patientIdentifier}
              isEditing={isEditing}
              toggleEditing={toggleEditing}
              setPatientIdentifier={setPatientIdentifier}
              savePatientIdentifier={savePatientIdentifier}
              isPending={isPending}
            />
          )}
        </TabsContent>

        <TabsContent value="assignments" className="mt-0">
          <AssignmentSection
            entry={entry}
            onAssignOptician={onAssignOptician}
            onAssignStore={onAssignStore}
            isPending={isPending}
          />
        </TabsContent>
      </ScrollArea>
    </Tabs>
  );
}
