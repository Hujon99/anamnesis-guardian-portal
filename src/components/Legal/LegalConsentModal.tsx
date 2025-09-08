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
      <DialogContent className="max-w-4xl max-h-[80vh] bg-surface-light">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 h-[60vh]">
          <LegalDocumentViewer content={content} />
        </div>
      </DialogContent>
    </Dialog>
  );
};