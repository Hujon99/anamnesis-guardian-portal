/**
 * Legal Consent Modal Component
 * Modal dialog for displaying legal documents (privacy policy, terms of service).
 * Provides a clean, scrollable interface for reading legal content without leaving the form.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LegalDocumentViewer } from './LegalDocumentViewer';

interface LegalConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export const LegalConsentModal: React.FC<LegalConsentModalProps> = ({
  isOpen,
  onClose,
  title,
  content
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[85vh] bg-card border border-border shadow-elegant">
        <DialogHeader className="pb-4 border-b border-border">
          <DialogTitle className="text-xl font-semibold text-foreground pr-8">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 flex-1 min-h-0">
          <LegalDocumentViewer content={content} className="h-[65vh]" />
        </div>
      </DialogContent>
    </Dialog>
  );
};