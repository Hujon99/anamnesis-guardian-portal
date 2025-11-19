/**
 * FormPrintPreview Component
 * 
 * Main component for print-friendly form display.
 * Optimized for A4 paper format with:
 * - Header with form title and metadata on each page
 * - Smart handling of conditional questions (indented with instructions)
 * - Footer with confidential notice
 * - Proper page breaks to avoid splitting questions
 * 
 * Opens in a new window optimized for printing or PDF export.
 */

import React, { useEffect, useState } from 'react';
import { FormTemplate, FormSection as FormSectionType } from '@/types/anamnesis';
import { PrintableQuestion } from './PrintableQuestion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';

interface FormPrintPreviewProps {
  template: FormTemplate;
  onClose?: () => void;
}

export const FormPrintPreview: React.FC<FormPrintPreviewProps> = ({ template, onClose }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>(
    template.sections.map((_, idx) => idx.toString())
  );
  const [includeInternalNotes, setIncludeInternalNotes] = useState(false);

  // Build a map of question IDs to labels for easy lookup
  const buildQuestionMap = () => {
    const map = new Map<string, string>();
    template.sections.forEach(section => {
      section.questions.forEach(q => {
        map.set(q.id, q.label);
      });
    });
    return map;
  };

  const questionMap = buildQuestionMap();

  // Build dependency tree to identify conditional questions
  const buildDependencyMap = () => {
    const map = new Map<string, { parentQuestion: string; condition: any }>();
    
    template.sections.forEach(section => {
      section.questions.forEach(question => {
        if (question.show_if) {
          map.set(question.id, {
            parentQuestion: question.show_if.question,
            condition: question.show_if
          });
        }
      });
    });
    
    return map;
  };

  const generateConditionalInstruction = (condition: any): string => {
    if (!condition) return '';
    
    const { question: parentId, equals, contains } = condition;
    const parentLabel = questionMap.get(parentId) || parentId;
    
    if (equals) {
      const values = Array.isArray(equals) ? equals.join('" eller "') : equals;
      return `Besvara endast om du valde "${values}" på "${parentLabel}"`;
    }
    
    if (contains) {
      return `Besvara endast om ditt svar på "${parentLabel}" innehåller "${contains}"`;
    }
    
    return `Besvara endast om villkoret för "${parentLabel}" uppfylls`;
  };

  const dependencyMap = buildDependencyMap();
  let questionCounter = 0;

  useEffect(() => {
    // Auto-focus the print window
    window.focus();
  }, []);

  const handlePrint = () => {
    window.print();
    if (onClose) onClose();
  };

  const toggleSection = (sectionIdx: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionIdx) 
        ? prev.filter(idx => idx !== sectionIdx)
        : [...prev, sectionIdx]
    );
  };

  const filteredSections = template.sections.filter((_, idx) => 
    selectedSections.includes(idx.toString())
  );

  return (
    <div className="print-preview-container">
      {/* Print-only styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 2cm;
          }
          
          body {
            font-size: 11pt;
            line-height: 1.4;
            color: #000;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-question {
            page-break-inside: avoid;
          }
          
          .print-section {
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          
          .print-header {
            display: block;
            position: running(header);
          }
          
          .print-footer {
            display: block;
            position: running(footer);
          }
        }
        
        @media screen {
          .print-preview-container {
            max-width: 21cm;
            margin: 0 auto;
            padding: 2rem;
            background: white;
          }
        }
      `}</style>

      {/* Screen-only controls */}
      <div className="no-print mb-6 flex justify-end gap-4 print:hidden">
        <Button
          onClick={() => setShowSettings(true)}
          variant="outline"
        >
          <Settings className="w-4 h-4 mr-2" />
          Inställningar
        </Button>
        <Button
          onClick={onClose}
          variant="outline"
        >
          Stäng
        </Button>
        <Button
          onClick={handlePrint}
        >
          Skriv ut / Spara som PDF
        </Button>
      </div>

      {/* Print content */}
      <div className="print-content">
        {/* Header - appears on every page when printed */}
        <div className="print-header mb-8 pb-4 border-b-2 border-gray-300">
          <h1 className="text-2xl font-bold mb-2">{template.title}</h1>
          <div className="flex justify-between text-sm text-gray-600">
            <div className="space-y-1">
              <div>
                <span className="font-medium">Patientnamn:</span>
                <span className="inline-block border-b border-gray-400 ml-2 w-48"></span>
              </div>
              <div>
                <span className="font-medium">Personnummer:</span>
                <span className="inline-block border-b border-gray-400 ml-2 w-48"></span>
              </div>
            </div>
            <div className="space-y-1">
              <div>
                <span className="font-medium">Datum:</span>
                <span className="inline-block border-b border-gray-400 ml-2 w-32"></span>
              </div>
              <div className="text-right text-xs text-gray-500">
                Sida ___ av ___
              </div>
            </div>
          </div>
        </div>

        {/* Form sections and questions */}
        {filteredSections.map((section: FormSectionType, sectionIdx: number) => (
          <div key={sectionIdx} className="print-section mb-8">
            <h2 className="text-xl font-bold mb-4 pb-2 border-b border-gray-400">
              {section.section_title}
            </h2>

            <div className="questions space-y-4">
              {section.questions.map((question) => {
                questionCounter++;
                const questionNumber = `Q${questionCounter}`;
                const dependency = dependencyMap.get(question.id);
                const isConditional = !!dependency;
                const conditionalInstruction = dependency 
                  ? generateConditionalInstruction(dependency.condition)
                  : undefined;

                return (
                  <PrintableQuestion
                    key={question.id}
                    question={question}
                    questionNumber={questionNumber}
                    isConditional={isConditional}
                    conditionalInstruction={conditionalInstruction}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Internal Notes Section */}
        {includeInternalNotes && (
          <div className="print-section mb-8">
            <h2 className="text-xl font-bold mb-4 pb-2 border-b border-gray-400">
              Optikerns anteckningar
            </h2>
            <div className="space-y-4">
              <div className="min-h-[100px] border border-gray-300 rounded p-3">
                <p className="text-sm text-gray-500 italic">Fyll i under undersökningen...</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="print-footer mt-12 pt-4 border-t-2 border-gray-300 text-center text-xs text-gray-600">
          <p className="font-medium">⚠️ Konfidentiell medicinsk information</p>
          <p className="mt-1">Detta dokument innehåller känslig patientinformation och ska hanteras enligt GDPR</p>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Inställningar för utskrift</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Section Selection */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Välj sektioner att inkludera:</h3>
              {template.sections.map((section, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <Checkbox
                    id={`section-${idx}`}
                    checked={selectedSections.includes(idx.toString())}
                    onCheckedChange={() => toggleSection(idx.toString())}
                  />
                  <Label
                    htmlFor={`section-${idx}`}
                    className="text-sm cursor-pointer"
                  >
                    {section.section_title}
                  </Label>
                </div>
              ))}
            </div>

            {/* Internal Notes Toggle */}
            <div className="pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="internal-notes"
                  checked={includeInternalNotes}
                  onCheckedChange={(checked) => setIncludeInternalNotes(checked as boolean)}
                />
                <Label
                  htmlFor="internal-notes"
                  className="text-sm cursor-pointer"
                >
                  Inkludera utrymme för optikerns anteckningar
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowSettings(false)}>
              Klar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
